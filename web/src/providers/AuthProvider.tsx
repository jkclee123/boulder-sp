import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, OAuthProvider, signOut as fbSignOut, signInWithRedirect, getRedirectResult } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, canInitializeFirebase, db, functions } from '../firebase'
import type { User } from 'firebase/auth'

type UserProfile = {
  uid: string
  email: string | null
  name: string | null
  phoneNumber: string | null
  createdAt: any
  updatedAt: any
}

type AuthContextValue = {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  isAuthReady: boolean
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (name: string, phoneNumber?: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Using shared `auth` instance from ../firebase

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasCheckedRedirect, setHasCheckedRedirect] = useState(false)

  const refreshProfile = async () => {
    if (!user || !functions) {
      console.log('refreshProfile: user or functions not available', { user: !!user, functions: !!functions })
      return
    }
    
    try {
      console.log('refreshProfile: calling getUserProfile function')
      const getUserProfile = httpsCallable(functions, 'getUserProfile')
      const result = await getUserProfile({})
      console.log('refreshProfile: result received', result.data)
      setUserProfile(result.data as UserProfile)
    } catch (error) {
      console.error('Error refreshing profile:', error)
      // If the function call fails, try to get the profile directly from Firestore
      if (db && user) {
        try {
          console.log('refreshProfile: falling back to direct Firestore read')
          const userDocRef = doc(db, 'users', user.uid)
          const userDoc = await getDoc(userDocRef)
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const profile: UserProfile = {
              uid: userData.uid,
              email: userData.email,
              name: userData.name,
              phoneNumber: userData.phoneNumber,
              createdAt: userData.createdAt,
              updatedAt: userData.updatedAt,
            }
            console.log('refreshProfile: direct read successful', profile)
            setUserProfile(profile)
          }
        } catch (fallbackError) {
          console.error('Error in fallback profile read:', fallbackError)
        }
      }
    }
  }

  const updateProfile = async (name: string, phoneNumber?: string) => {
    if (!user || !functions) throw new Error('Not authenticated or functions not available')
    
    try {
      console.log('AuthProvider: updateProfile called with:', { name, phoneNumber })
      console.log('AuthProvider: functions available:', !!functions)
      console.log('AuthProvider: user authenticated:', !!user)
      
      const updateUserProfile = httpsCallable(functions, 'updateUserProfile')
      console.log('AuthProvider: updateUserProfile function created')
      
      const result = await updateUserProfile({ name, phoneNumber })
      console.log('AuthProvider: updateUserProfile result:', result)
      
      await refreshProfile()
    } catch (error) {
      console.error('AuthProvider: Error updating profile:', error)
      console.error('AuthProvider: Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code || 'No code',
        details: (error as any)?.details || 'No details'
      })
      throw error
    }
  }

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
      // On first login, create a user document in Firestore (collection: "user")
      if (nextUser && db) {
        ;(async () => {
          try {
            const userDocRef = doc(db, 'users', nextUser.uid)
            const existing = await getDoc(userDocRef)
            if (!existing.exists()) {
              console.log('Creating new user document for:', nextUser.uid)
              const nameFromDisplayOrEmail = nextUser.displayName ?? (nextUser.email?.split('@')[0] ?? null)
              await setDoc(userDocRef, {
                uid: nextUser.uid,
                email: nextUser.email ?? null,
                name: nameFromDisplayOrEmail,
                providerIds: Array.isArray(nextUser.providerData)
                  ? nextUser.providerData.map(p => p?.providerId).filter(Boolean)
                  : [],
                createdAt: serverTimestamp(),
              })
              console.log('User document created successfully')
              
              // After creating the document, set the profile immediately from the data we just created
              const profile: UserProfile = {
                uid: nextUser.uid,
                email: nextUser.email,
                name: nameFromDisplayOrEmail,
                phoneNumber: null,
                createdAt: new Date(), // Use current time as fallback for immediate display
                updatedAt: null,
              }
              setUserProfile(profile)
              console.log('Profile set immediately after creation:', profile)
              
              // Refresh profile to get the actual server timestamp
              setTimeout(() => {
                refreshProfile()
              }, 1000)
            } else {
              console.log('User document already exists, fetching profile...')
              // User document exists, try to refresh profile
              await refreshProfile()
            }
          } catch (error) {
            console.error('Error in user document creation/fetch:', error)
            // If there's an error, try to read the profile directly from Firestore
            try {
              const userDocRef = doc(db, 'users', nextUser.uid)
              const userDoc = await getDoc(userDocRef)
              if (userDoc.exists()) {
                const userData = userDoc.data()
                const profile: UserProfile = {
                  uid: userData.uid,
                  email: userData.email,
                  name: userData.name,
                  phoneNumber: userData.phoneNumber,
                  createdAt: userData.createdAt,
                  updatedAt: userData.updatedAt,
                }
                console.log('Fallback profile read successful:', profile)
                setUserProfile(profile)
              }
            } catch (fallbackError) {
              console.error('Error in fallback profile read:', fallbackError)
            }
          }
        })()
      } else {
        setUserProfile(null)
      }
      // Ensure we do not prematurely clear loading while redirect result is pending
      if (hasCheckedRedirect) {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [hasCheckedRedirect])

  // Additional effect to ensure profile is fetched when functions become available
  useEffect(() => {
    if (user && functions && !userProfile) {
      console.log('Functions available, fetching profile for existing user')
      refreshProfile()
    }
  }, [user, functions, userProfile])

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
        // Prefer redirect on mobile/webviews for higher reliability
        await signInWithRedirect(auth, provider)
        return
      }

      // Try popup first on desktop
      try {
        await signInWithPopup(auth, provider)
      } catch (err) {
        const possible = err as { code?: string; message?: string } | undefined
        const code = possible?.code || possible?.message || ''
        // Fallback to redirect for common popup failures (blocked/closed/etc.)
        if (typeof code === 'string' && /popup|blocked|cancel/i.test(code)) {
          await signInWithRedirect(auth, provider)
          return
        }
        throw err
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
    () => ({ user, loading, isAuthReady: Boolean(auth && canInitializeFirebase), signInWithGoogle, signInWithApple, signOut, userProfile, updateProfile, refreshProfile }),
    [user, loading, userProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}


