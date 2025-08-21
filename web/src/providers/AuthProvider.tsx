import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, OAuthProvider, signOut as fbSignOut, signInWithRedirect, getRedirectResult } from 'firebase/auth'
import { doc, getDocFromServer, serverTimestamp, setDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, canInitializeFirebase, db, functions } from '../firebase'
import type { User } from 'firebase/auth'

type UserProfile = {
  uid: string
  email: string | null
  name: string | null
  phoneNumber: string | null
  telegramId: string | null
  createdAt: any
  updatedAt: any
  gymMemberId: Record<string, string>
  isAdmin?: boolean
}

type AuthContextValue = {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  isAuthReady: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (name: string, phoneNumber?: string, telegramId?: string, gymMemberId?: Record<string, string>) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const isLikelyMobile = (): boolean => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || navigator.vendor
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(ua)
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasCheckedRedirect, setHasCheckedRedirect] = useState(false)

  const userRef = useRef(user);
  userRef.current = user;

  const refreshProfile = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser || !functions) {
      return
    }
    
    try {
      const getUserProfile = httpsCallable(functions, 'getUserProfile')
      const result = await getUserProfile({})
      setUserProfile(result.data as UserProfile)
    } catch (error) {
      console.error('Error refreshing profile:', error)
      if (db && currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid)
          const userDoc = await getDocFromServer(userDocRef)
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const profile: UserProfile = {
              uid: userData.uid,
              email: userData.email,
              name: userData.name,
              phoneNumber: userData.phoneNumber,
              telegramId: userData.telegramId,
              createdAt: userData.createdAt,
              updatedAt: userData.updatedAt,
              gymMemberId: userData.gymMemberId,
              isAdmin: userData.isAdmin,
            }
            setUserProfile(profile)
          }
        } catch (fallbackError) {
          console.error('Error in fallback profile read:', fallbackError)
        }
      }
    }
  }, [])

  const updateProfile = useCallback(async (name: string, phoneNumber?: string, telegramId?: string, gymMemberId?: Record<string, string>) => {
    const currentUser = userRef.current;
    if (!currentUser || !functions) throw new Error('Not authenticated or functions not available')
    
    try {
      const updateUserProfile = httpsCallable(functions, 'updateUserProfile')
      const payload = { name, phoneNumber, telegramId, gymMemberId };
      console.log('Updating profile with payload:', payload);
      await updateUserProfile(payload)
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
  }, [refreshProfile])

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    getRedirectResult(auth)
      .catch(() => {})
      .finally(() => setHasCheckedRedirect(true))

    const unsub = onAuthStateChanged(auth, nextUser => {
      setUser(nextUser)
      if (nextUser && db) {
        ;(async () => {
          try {
            const userDocRef = doc(db, 'users', nextUser.uid)
            const existing = await getDocFromServer(userDocRef)
            if (!existing.exists()) {
              const nameFromDisplayOrEmail = nextUser.displayName ?? (nextUser.email?.split('@')[0] ?? null)
              await setDoc(userDocRef, {
                uid: nextUser.uid,
                email: nextUser.email ?? null,
                name: nameFromDisplayOrEmail,
                providerIds: Array.isArray(nextUser.providerData)
                  ? nextUser.providerData.map(p => p?.providerId).filter(Boolean)
                  : [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isAdmin: false,
                adminGym: null,
                telegramId: null,
                phoneNumber: null,
                gymMemberId: {},
              })
              
              const profile: UserProfile = {
                uid: nextUser.uid,
                email: nextUser.email,
                name: nameFromDisplayOrEmail,
                phoneNumber: null,
                telegramId: null,
                createdAt: new Date(),
                updatedAt: null,
                gymMemberId: {},
                isAdmin: false,
              }
              setUserProfile(profile)
              
              setTimeout(() => {
                refreshProfile()
              }, 1000)
            } else {
              await refreshProfile()
            }
          } catch (error) {
            console.error('Error in user document creation/fetch:', error)
            try {
              const userDocRef = doc(db, 'users', nextUser.uid)
              const userDoc = await getDocFromServer(userDocRef)
              if (userDoc.exists()) {
                const userData = userDoc.data()
                const profile: UserProfile = {
                  uid: userData.uid,
                  email: userData.email,
                  name: userData.name,
                  phoneNumber: userData.phoneNumber,
                  telegramId: userData.telegramId,
                  createdAt: userData.createdAt,
                  updatedAt: userData.updatedAt,  
                  gymMemberId: userData.gymMemberId,
                  isAdmin: userData.isAdmin,
                }
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
      if (hasCheckedRedirect) {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [hasCheckedRedirect, refreshProfile])

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error('Firebase is not configured')
    const provider = new GoogleAuthProvider()
    setLoading(true)
    try {
      if (isLikelyMobile()) {
        await signInWithRedirect(auth, provider)
        return
      }

      try {
        await signInWithPopup(auth, provider)
      } catch (err) {
        const possible = err as { code?: string; message?: string } | undefined
        const code = possible?.code || possible?.message || ''
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
  }, [])

  const signInWithApple = useCallback(async () => {
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
  }, [])

  const signOut = useCallback(async () => {
    if (!auth) return
    await fbSignOut(auth)
  }, [])

  const value = useMemo(
    () => ({ user, loading, isAuthReady: Boolean(auth && canInitializeFirebase), signInWithGoogle, signInWithApple, signOut, userProfile, updateProfile, refreshProfile }),
    [user, loading, userProfile, signInWithGoogle, signInWithApple, signOut, updateProfile, refreshProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}