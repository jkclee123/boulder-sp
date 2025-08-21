import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions'

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
let functions: Functions | null = null

try {
  if (canInitializeFirebase) {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
    functions = getFunctions(app)

    if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
      try {
        connectAuthEmulator(auth, 'http://192.168.0.6:9099')
      } catch {}
      try {
        connectFirestoreEmulator(db, '192.168.0.6', 8080)
      } catch {}
      try {
        connectFunctionsEmulator(functions, '192.168.0.6', 5002)
      } catch {}
    }
  }
} catch {
  app = null
  auth = null
  db = null
  functions = null
}

export { app, auth, db, functions }


