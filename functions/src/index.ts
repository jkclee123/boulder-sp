import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()

const db = admin.firestore()

// Update user profile
export const updateUserProfile = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { name, phoneNumber } = data
  const uid = context.auth.uid

  // Validate input
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Name is required and must be a non-empty string')
  }

  if (phoneNumber && typeof phoneNumber !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Phone number must be a string')
  }

  try {
    // Update user profile in Firestore - using 'users' collection to match security rules
    await db.collection('users').doc(uid).update({
      name: name.trim(),
      phoneNumber: phoneNumber?.trim() || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating user profile:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('permission-denied')) {
        throw new functions.https.HttpsError('permission-denied', 'You do not have permission to update this profile')
      } else if (error.message.includes('not-found')) {
        throw new functions.https.HttpsError('not-found', 'User profile not found')
      } else if (error.message.includes('unavailable')) {
        throw new functions.https.HttpsError('unavailable', 'Firestore is temporarily unavailable')
      }
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to update profile. Please try again.')
  }
})

// Get user profile
export const getUserProfile = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const uid = context.auth.uid

  try {
    // Use 'users' collection to match security rules
    const userDoc = await db.collection('users').doc(uid).get()
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User profile not found')
    }

    const userData = userDoc.data()
    return {
      uid: userData?.uid,
      email: userData?.email,
      name: userData?.name,
      phoneNumber: userData?.phoneNumber,
      createdAt: userData?.createdAt,
      updatedAt: userData?.updatedAt,
    }
  } catch (error) {
    console.error('Error getting user profile:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('permission-denied')) {
        throw new functions.https.HttpsError('permission-denied', 'You do not have permission to read this profile')
      } else if (error.message.includes('unavailable')) {
        throw new functions.https.HttpsError('unavailable', 'Firestore is temporarily unavailable')
      }
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to get profile. Please try again.')
  }
})
