// path: src/app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useLoginWithAbstract, useAbstractClient } from '@abstract-foundation/agw-react'
import { useAccount, useContractRead } from 'wagmi'
import { parseAbi } from 'viem'
import NextImage from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wallet,
  ImageIcon,
  ArrowRight,
  LogOut,
} from 'lucide-react'
import ThemeSwitcher from '@/components/theme-switcher'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`
const contractAbi = parseAbi([
  'function mintedTokenId(address) view returns (uint256)',
  'function mint()',
])

export default function HomePage() {
  const { login, logout } = useLoginWithAbstract()
  const { status, address } = useAccount()
  const { data: agwClient } = useAbstractClient()

  const [imageUrl, setImageUrl] = useState('')
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const [isPreviewValid, setIsPreviewValid] = useState(false)

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

  // Validate image URL when it changes
  useEffect(() => {
    if (!imageUrl) {
      setIsPreviewValid(false)
      return
    }

    // Use the browser's Image constructor, not Next.js Image component
    const imgElement = new window.Image()
    imgElement.onload = () => setIsPreviewValid(true)
    imgElement.onerror = () => setIsPreviewValid(false)
    imgElement.src = imageUrl
  }, [imageUrl])

  async function handleMint() {
    setErrorMessage('')
    setSuccessMessage('')
    setIsMinting(true)

    if (!agwClient) {
      setErrorMessage('No wallet client found.')
      setIsMinting(false)
      return
    }

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
    } finally {
      setIsMinting(false)
    }
  }

  async function handleUpdate() {
    setErrorMessage('')
    setSuccessMessage('')
    setIsUpdating(true)

    if (!agwClient || !address) {
      setErrorMessage('No wallet client or address found.')
      setIsUpdating(false)
      return
    }
    if (!tokenId || tokenId === 0n) {
      setErrorMessage('You have not minted an NFT yet.')
      setIsUpdating(false)
      return
    }
    if (!imageUrl) {
      setErrorMessage('Please provide an image URL.')
      setIsUpdating(false)
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
        setImageUrl('')
        setIsPreviewValid(false)
      }
    } catch (err) {
      const error = err as Error
      setErrorMessage(error.message || 'An error occurred while updating.')
    } finally {
      setIsUpdating(false)
    }
  }

  // Header actions component with theme switcher and logout button
  const HeaderActions = () => (
    <div className="flex items-center gap-2">
      <ThemeSwitcher />
      {status === 'connected' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="mr-1 h-4 w-4" />
          <span>Logout</span>
        </Button>
      )}
    </div>
  )

  // Loading states
  if (status === 'connecting' || status === 'reconnecting') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-2xl">Portal Avatar</CardTitle>
              <CardDescription>Connecting to wallet</CardDescription>
            </div>
            <ThemeSwitcher />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Connecting to your wallet...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Disconnected state
  if (status === 'disconnected') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-2xl">Portal Avatar</CardTitle>
              <CardDescription>
                Connect your wallet to mint and manage your NFT avatar
              </CardDescription>
            </div>
            <ThemeSwitcher />
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-6 pb-6">
            <div className="rounded-full bg-primary/10 p-6">
              <Wallet className="h-12 w-12 text-primary" />
            </div>
            <p className="text-center text-muted-foreground">
              Please connect your wallet to access your NFT avatar
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={login} className="w-full" size="lg">
              Connect Wallet
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Loading NFT data
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-2xl">Portal Avatar</CardTitle>
              <CardDescription>Loading NFT data</CardDescription>
            </div>
            <HeaderActions />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Loading your NFT data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No NFT state - need to mint
  if (!tokenId || tokenId === 0n) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-2xl">Portal Avatar</CardTitle>
              <CardDescription>Mint your NFT to get started</CardDescription>
            </div>
            <HeaderActions />
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-6 pb-6">
            <div className="rounded-full bg-primary/10 p-6">
              <ImageIcon className="h-12 w-12 text-primary" />
            </div>
            <p className="text-center text-muted-foreground">
              You don&apos;t have an NFT yet. Mint one to create your personalized avatar.
            </p>

            {errorMessage && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="mt-4 border-green-500 text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleMint} className="w-full" size="lg" disabled={isMinting}>
              {isMinting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Minting...
                </>
              ) : (
                'Mint NFT'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Has NFT state - can update image
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-2xl">Portal Avatar</CardTitle>
            <CardDescription>
              NFT Token #{tokenId.toString()} - Update your avatar image
            </CardDescription>
          </div>
          <HeaderActions />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Before/After comparison */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Current Image (Before) */}
            <div className="flex flex-col items-center space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Current Avatar</h3>
              <div className="overflow-hidden rounded-xl border-2 border-primary/20 bg-muted/30 p-1">
                {currentImage ? (
                  <NextImage
                    src={currentImage || '/placeholder.svg'}
                    alt="Current Avatar"
                    width={200}
                    height={200}
                    className="h-48 w-48 rounded-lg object-cover transition-all hover:scale-105"
                  />
                ) : (
                  <div className="flex h-48 w-48 items-center justify-center rounded-lg">
                    <p className="text-center text-sm text-muted-foreground">No image set</p>
                  </div>
                )}
              </div>
            </div>

            {/* New Image Preview (After) */}
            <div className="flex flex-col items-center space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">New Avatar Preview</h3>
              <div className="overflow-hidden rounded-xl border-2 border-primary/20 bg-muted/30 p-1">
                {imageUrl && isPreviewValid ? (
                  <NextImage
                    src={imageUrl || '/placeholder.svg'}
                    alt="New Avatar Preview"
                    width={200}
                    height={200}
                    className="h-48 w-48 rounded-lg object-cover transition-all hover:scale-105"
                  />
                ) : (
                  <div className="flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30">
                    <p className="text-center text-sm text-muted-foreground">
                      {imageUrl ? 'Invalid image URL' : 'Enter URL below'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Arrow for small screens */}
            <div className="flex items-center justify-center md:hidden">
              <div className="rounded-full bg-muted p-2">
                <ArrowRight className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="imageUrl" className="text-sm font-medium">
              Image URL
            </label>
            <Input
              id="imageUrl"
              placeholder="https://example.com/avatar.png"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Enter a direct URL to your image (PNG, JPG, GIF, WEBP)
            </p>
          </div>

          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="border-green-500 text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleUpdate}
            className="w-full"
            size="lg"
            disabled={isUpdating || !imageUrl.trim() || !isPreviewValid}
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Avatar'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
