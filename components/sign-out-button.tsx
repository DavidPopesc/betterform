'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function SignOutButton() {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState(false)

  const handleSignOut = async () => {
    if (isSigningOut) return

    setIsSigningOut(true)
    setSignOutError(false)
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Logout request failed')
      }

      router.replace('/login')
      router.refresh()
    } catch (error) {
      console.error('Failed to sign out:', error)
      setSignOutError(true)
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
      <LogOut className="mr-2 h-4 w-4" />
      {isSigningOut ? 'Signing out...' : signOutError ? 'Try again' : 'Sign out'}
    </Button>
  )
}