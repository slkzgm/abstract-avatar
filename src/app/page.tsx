// path: src/app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useLoginWithAbstract, useAbstractClient } from '@abstract-foundation/agw-react'
import { useAccount, useContractRead } from 'wagmi'
import { parseAbi } from 'viem'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`
const contractAbi = parseAbi([
  'function mintedTokenId(address) view returns (uint256)',
  'function mint()',
])

export default function HomePage() {
  const { login } = useLoginWithAbstract()
  const { status, address } = useAccount()
  const { data: agwClient } = useAbstractClient()

  const [imageUrl, setImageUrl] = useState('')
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const {
    data: tokenId,
    isLoading,
    refetch,
  } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: contractAbi,
    functionName: 'mintedTokenId',
    args: [address as `0x${string}`],
    query: {
      enabled: status === 'connected' && !!address,
    },
  })

  // Fetch current image from the database once we have a valid tokenId
  useEffect(() => {
    if (!tokenId || tokenId === 0n) {
      setCurrentImage(null)
      return
    }

    const idNum = tokenId.toString()
    fetch(`/api/avatar?tokenId=${idNum}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setErrorMessage(data.error)
          setCurrentImage(null)
        } else {
          setCurrentImage(data.imageUrl)
        }
      })
      .catch((err) => {
        const error = err as Error
        setErrorMessage(error.message)
      })
  }, [tokenId])

  async function handleMint() {
    setErrorMessage('')
    setSuccessMessage('')
    if (!agwClient) return

    try {
      await agwClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: contractAbi,
        functionName: 'mint',
        args: [],
      })
      await refetch()
      setSuccessMessage('You have successfully minted your NFT.')
    } catch (err) {
      const error = err as Error
      setErrorMessage(error.message || 'An error occurred while minting.')
    }
  }

  async function handleUpdate() {
    setErrorMessage('')
    setSuccessMessage('')
    if (!agwClient || !address) {
      setErrorMessage('No wallet client or address found.')
      return
    }
    if (!tokenId || tokenId === 0n) {
      setErrorMessage('You have not minted an NFT yet.')
      return
    }
    if (!imageUrl) {
      setErrorMessage('Please provide an image URL.')
      return
    }

    const nonce = uuidv4()
    const message = [
      `Address: ${address}`,
      `TokenID: ${tokenId}`,
      `ImageURL: ${imageUrl}`,
      `Nonce: ${nonce}`,
    ].join('\n')

    try {
      const signature = await agwClient.signMessage({ message })
      const response = await fetch('/api/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          tokenId: tokenId.toString(),
          imageUrl,
          message,
          signature,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setErrorMessage(data.error || 'Failed to update image.')
      } else {
        setCurrentImage(imageUrl)
        setSuccessMessage('Your avatar URL was updated successfully.')
      }
    } catch (err) {
      const error = err as Error
      setErrorMessage(error.message || 'An error occurred while updating.')
    }
  }

  if (status === 'connecting' || status === 'reconnecting') {
    return <p>Connecting...</p>
  }

  if (status === 'disconnected') {
    return (
      <div>
        <p>Please connect your wallet.</p>
        <Button onClick={login}>Connect</Button>
      </div>
    )
  }

  if (isLoading) {
    return <p>Loading...</p>
  }

  if (!tokenId || tokenId === 0n) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p>You have no NFT yet.</p>
        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
        {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
        <Button onClick={handleMint}>Mint NFT</Button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p>Your NFT (token #{tokenId.toString()}) is minted.</p>
      {currentImage ? (
        <div>
          <p>Current image:</p>
          <Image src={currentImage} alt="Current Avatar" width={150} height={150} />
        </div>
      ) : (
        <p>No custom image set yet.</p>
      )}
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
      <div>
        <label>New Image URL:</label>
        <input
          placeholder="https://example.com/avatar.png"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
      </div>
      <Button onClick={handleUpdate}>Update</Button>
    </div>
  )
}
