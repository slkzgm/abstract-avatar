/* eslint-disable @typescript-eslint/no-explicit-any */
// path: src/app/api/metadata/[tokenId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Avatar from '@/models/Avatar'

export async function GET(request: NextRequest, context: any): Promise<NextResponse> {
  try {
    await connectDB()

    const tokenId = context.params.tokenId
    const parsedTokenId = parseInt(tokenId, 10)
    if (isNaN(parsedTokenId) || parsedTokenId <= 0) {
      return NextResponse.json({ error: 'Invalid tokenId' }, { status: 400 })
    }

    const avatar = await Avatar.findOne({ tokenId: parsedTokenId })
    if (!avatar) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 })
    }

    const metadata = {
      name: `Portal Avatar #${parsedTokenId}`,
      description: 'Dynamic NFT avatar for Portal app.',
      image: avatar.imageUrl,
    }

    return NextResponse.json(metadata)
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
