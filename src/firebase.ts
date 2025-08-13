import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

export const canInitializeFirebase = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
)

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

try {
  if (canInitializeFirebase) {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)

    if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
      try {
        connectAuthEmulator(auth, 'http://127.0.0.1:9099')
      } catch {}
      try {
        connectFirestoreEmulator(db, '127.0.0.1', 8080)
      } catch {}
    }
  }
} catch {
  app = null
  auth = null
  db = null
}

export { app, auth, db }


