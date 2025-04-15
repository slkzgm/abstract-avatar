// path: src/app/api/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { parseAbi } from 'viem'
import { publicClient } from '@/lib/publicClient'
import connectDB from '@/lib/db'
import Avatar from '@/models/Avatar'

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`

// Minimal read ABI for verifying ownership
const nftAbi = parseAbi(['function ownerOf(uint256) view returns (address)'])

// GET /api/avatar?tokenId=123
export async function GET(request: NextRequest) {
  try {
    const tokenIdParam = request.nextUrl.searchParams.get('tokenId')
    if (!tokenIdParam) {
      return NextResponse.json({ error: 'Missing tokenId' }, { status: 400 })
    }

    const tokenId = parseInt(tokenIdParam, 10)
    if (isNaN(tokenId) || tokenId <= 0) {
      return NextResponse.json({ error: 'Invalid tokenId' }, { status: 400 })
    }

    await connectDB()
    const avatar = await Avatar.findOne({ tokenId })
    if (!avatar) {
      // Not found in DB => no custom URL is set
      return NextResponse.json({ imageUrl: null }, { status: 200 })
    }

    return NextResponse.json({ imageUrl: avatar.imageUrl }, { status: 200 })
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/avatar
export async function POST(request: NextRequest) {
  try {
    const { address, tokenId, imageUrl, message, signature } = await request.json()

    if (!address || !tokenId || !imageUrl || !message || !signature) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Verify signature using viem's publicClient
    const isValid = await publicClient.verifyMessage({ address, message, signature })
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Confirm on-chain ownership via ownerOf(tokenId)
    const owner = await publicClient.readContract({
      address: contractAddress,
      abi: nftAbi,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
    })
    if (owner.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Address does not own this token' }, { status: 403 })
    }

    // Validate image URL (basic check)
    if (!/^https?:\/\/\S+\.(png|jpg|jpeg|gif|webp)$/i.test(imageUrl)) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 })
    }

    // Update the database record
    await connectDB()
    await Avatar.findOneAndUpdate(
      { tokenId: parseInt(tokenId, 10) },
      { imageUrl },
      { upsert: true, new: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
