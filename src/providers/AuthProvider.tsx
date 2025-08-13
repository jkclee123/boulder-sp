import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, OAuthProvider, signOut as fbSignOut, signInWithRedirect, getRedirectResult } from 'firebase/auth'
import { auth, canInitializeFirebase } from '../firebase'
import type { User } from 'firebase/auth'

type AuthContextValue = {
  user: User | null
  loading: boolean
  isAuthReady: boolean
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Using shared `auth` instance from ../firebase

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasCheckedRedirect, setHasCheckedRedirect] = useState(false)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    // Consume any pending redirect result so auth state stabilizes on mobile
    getRedirectResult(auth)
      .catch(() => {
        // ignore; onAuthStateChanged will still reflect current user state
      })
      .finally(() => setHasCheckedRedirect(true))

    const unsub = onAuthStateChanged(auth, nextUser => {
      setUser(nextUser)
      // Ensure we do not prematurely clear loading while redirect result is pending
      if (hasCheckedRedirect) {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [hasCheckedRedirect])

  const isLikelyMobile = (): boolean => {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent || navigator.vendor
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(ua)
  }

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase is not configured')
    const provider = new GoogleAuthProvider()
    setLoading(true)
    try {
      if (isLikelyMobile()) {
        await signInWithRedirect(auth, provider)
      } else {
        await signInWithPopup(auth, provider)
      }
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signInWithApple = async () => {
    if (!auth) throw new Error('Firebase is not configured')
    const provider = new OAuthProvider('apple.com')
    setLoading(true)
    try {
      if (isLikelyMobile()) {
        await signInWithRedirect(auth, provider)
      } else {
        await signInWithPopup(auth, provider)
      }
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    if (!auth) return
    await fbSignOut(auth)
  }

  const value = useMemo(
    () => ({ user, loading, isAuthReady: Boolean(auth && canInitializeFirebase), signInWithGoogle, signInWithApple, signOut }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}


