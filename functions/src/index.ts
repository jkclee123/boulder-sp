import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

admin.initializeApp()

const db = admin.firestore()

// Update user profile
export const updateUserProfile = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { name, phoneNumber, telegramId, gymMemberId } = data
  const uid = context.auth.uid

  // Validate input
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Name is required and must be a non-empty string')
  }

  if (phoneNumber && typeof phoneNumber !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Phone number must be a string')
  }

  if (telegramId && typeof telegramId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Telegram ID must be a string')
  }

  if (gymMemberId && typeof gymMemberId !== 'object') {
    throw new functions.https.HttpsError('invalid-argument', 'Gym member ID must be an object')
  }

  try {
    // Update user profile in Firestore - using 'users' collection to match security rules
    await db.collection('users').doc(uid).update({
      name: name.trim(),
      phoneNumber: phoneNumber?.trim() || null,
      telegramId: telegramId?.trim() || null,
      updatedAt: FieldValue.serverTimestamp(),
      gymMemberId: gymMemberId || null,
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
      telegramId: userData?.telegramId,
      createdAt: userData?.createdAt,
      updatedAt: userData?.updatedAt,
      gymMemberId: userData?.gymMemberId || {},
      isAdmin: userData?.isAdmin || false,
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

// Transfer pass function
export const transfer = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const {
    fromUserId,
    toUserId,
    passId,
    passType,
    count,
    price
  } = data

  // Validate input
  if (!fromUserId || !toUserId || !passId || !passType || !count || typeof count !== 'number' || count <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid transfer parameters')
  }

  if (fromUserId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'You can only transfer your own passes')
  }

  if (fromUserId === toUserId) {
    throw new functions.https.HttpsError('invalid-argument', 'Cannot transfer to yourself')
  }

  const transferPrice = price || 0

  try {
    return await db.runTransaction(async (transaction) => {
      // Get source pass document
      let sourcePassRef;
      let sourcePassData;

      if (passType === 'private') {
        sourcePassRef = db.collection('privatePass').doc(passId)
      } else if (passType === 'market') {
        sourcePassRef = db.collection('marketPass').doc(passId)
      } else if (passType === 'admin') {
        sourcePassRef = db.collection('adminPass').doc(passId)
      } else {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid pass type')
      }

      const sourcePassDoc = await transaction.get(sourcePassRef)

      if (!sourcePassDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Source pass not found')
      }

      sourcePassData = sourcePassDoc.data()

      // Verify ownership and active status
      if (sourcePassData?.userRef?.id !== fromUserId) {
        throw new functions.https.HttpsError('permission-denied', 'You do not own this pass')
      }

      if (sourcePassData?.active !== true) {
        throw new functions.https.HttpsError('failed-precondition', 'Pass is not active')
      }

      // Check if pass is expired
      if (sourcePassData?.lastDay && sourcePassData.lastDay.toDate() < new Date()) {
        throw new functions.https.HttpsError('failed-precondition', 'Cannot transfer expired pass')
      }

      // Check if count is sufficient
      if (sourcePassData?.count < count) {
        throw new functions.https.HttpsError('failed-precondition', `Insufficient pass count. Available: ${sourcePassData.count}, Requested: ${count}`)
      }

      // Get recipient user
      const toUserRef = db.collection('users').doc(toUserId)
      const toUserDoc = await transaction.get(toUserRef)

      if (!toUserDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Recipient user not found')
      }

      // Calculate lastDay for new pass
      let newPassLastDay = null
      if (passType === 'admin') {
        // For admin passes, calculate new lastDay based on duration from now
        const duration = sourcePassData?.duration || 0
        if (duration > 0) {
          // Set lastDay to end of day at 23:59:59 HKT (UTC+8)
          const now = new Date()
          const newLastDay = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000)
          newLastDay.setHours(23, 59, 59, 999) // End of day
          newPassLastDay = admin.firestore.Timestamp.fromDate(newLastDay)
        }
      } else {
        // For private and market passes, preserve the original lastDay
        if (sourcePassData?.lastDay && typeof sourcePassData.lastDay.toDate === 'function') {
          newPassLastDay = sourcePassData.lastDay
        }
      }

      // Create new private pass for recipient
      const newPassRef = db.collection('privatePass').doc()
      const newPassData = {
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        gymDisplayName: sourcePassData?.gymDisplayName,
        gymId: sourcePassData?.gymId,
        purchasePrice: transferPrice,
        purchaseCount: count,
        count: count,
        userRef: toUserRef,
        lastDay: newPassLastDay,
        active: true
      }

      transaction.set(newPassRef, newPassData)

      // Reduce count from source pass (unless it's an admin pass)
      if (passType !== 'admin') {
        transaction.update(sourcePassRef, {
          count: FieldValue.increment(-count),
          updatedAt: FieldValue.serverTimestamp()
        })
      }

      // Create pass log entry
      const passLogRef = db.collection('passLog').doc()
      const passLogData = {
        createdAt: FieldValue.serverTimestamp(),
        gym: sourcePassData?.gymDisplayName,
        count: count,
        price: transferPrice,
        fromUserRef: db.collection('users').doc(fromUserId),
        toUserRef: toUserRef,
        action: 'transfer',
        participants: [fromUserId, toUserId]
      }

      transaction.set(passLogRef, passLogData)

      return {
        success: true,
        message: 'Transfer completed successfully',
        newPassId: newPassRef.id
      }
    })
  } catch (error) {
    console.error('Error in transfer:', error)

    if (error instanceof functions.https.HttpsError) {
      throw error
    }

    throw new functions.https.HttpsError('internal', 'Transfer failed. Please try again.')
  }
})
