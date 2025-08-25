import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

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
      adminGym: userData?.adminGym,
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
          const newLastDay = new Date(now)
          newLastDay.setMonth(newLastDay.getMonth() + duration)
          newLastDay.setHours(23, 59, 59, 999) // End of day
          newPassLastDay = Timestamp.fromDate(newLastDay)
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
        passName: sourcePassData?.passName,
        purchasePrice: passType === 'admin' ? sourcePassData?.price : transferPrice,
        purchaseCount: passType === 'admin' ? sourcePassData?.count : count,
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
        passName: sourcePassData?.passName,
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

// List private pass for market function
export const listPassForMarket = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const {
    privatePassId,
    count,
    price,
    remarks
  } = data

  // Validate input
  if (!privatePassId || !count || typeof count !== 'number' || count <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid market listing parameters')
  }

  if (typeof price !== 'number' || price <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Price must be a positive number')
  }

  const userId = context.auth.uid

  try {
    return await db.runTransaction(async (transaction) => {
      // Get user document to check telegramId
      const userRef = db.collection('users').doc(userId)
      const userDoc = await transaction.get(userRef)

      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found')
      }

      const userData = userDoc.data()
      if (!userData?.telegramId) {
        throw new functions.https.HttpsError('failed-precondition', 'You must set your Telegram ID before listing passes for sale')
      }

      // Get private pass document
      const privatePassRef = db.collection('privatePass').doc(privatePassId)
      const privatePassDoc = await transaction.get(privatePassRef)

      if (!privatePassDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Private pass not found')
      }

      const privatePassData = privatePassDoc.data()

      // Verify ownership and active status
      if (privatePassData?.userRef?.id !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'You do not own this pass')
      }

      if (privatePassData?.active !== true) {
        throw new functions.https.HttpsError('failed-precondition', 'Pass is not active')
      }

      // Check if pass is expired
      if (privatePassData?.lastDay && privatePassData.lastDay.toDate() < new Date()) {
        throw new functions.https.HttpsError('failed-precondition', 'Cannot list expired pass for sale')
      }

      // Check if count is sufficient
      if (privatePassData?.count < count) {
        throw new functions.https.HttpsError('failed-precondition', `Insufficient pass count. Available: ${privatePassData.count}, Requested: ${count}`)
      }

      // Create new market pass
      const marketPassRef = db.collection('marketPass').doc()
      const marketPassData = {
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        gymDisplayName: privatePassData?.gymDisplayName,
        gymId: privatePassData?.gymId,
        passName: privatePassData?.passName,
        price: price,
        count: count,
        userRef: userRef,
        privatePassRef: privatePassRef,
        remarks: remarks || '',
        lastDay: privatePassData?.lastDay,
        active: true
      }

      transaction.set(marketPassRef, marketPassData)

      // Reduce count from private pass
      transaction.update(privatePassRef, {
        count: FieldValue.increment(-count),
        updatedAt: FieldValue.serverTimestamp()
      })

      // Create pass log entry
      const passLogRef = db.collection('passLog').doc()
      const passLogData = {
        createdAt: FieldValue.serverTimestamp(),
        gym: privatePassData?.gymDisplayName,
        passName: privatePassData?.passName,
        count: count,
        price: price,
        fromUserRef: userRef,
        toUserRef: userRef, // Same user since it's a market listing
        action: 'market',
        participants: [userId]
      }

      transaction.set(passLogRef, passLogData)

      return {
        success: true,
        message: 'Pass listed for sale successfully',
        marketPassId: marketPassRef.id
      }
    })
  } catch (error) {
    console.error('Error in listPassForMarket:', error)

    if (error instanceof functions.https.HttpsError) {
      throw error
    }

    throw new functions.https.HttpsError('internal', 'Failed to list pass for sale. Please try again.')
  }
})

// Unlist market pass function
export const unlistPass = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const {
    marketPassId
  } = data

  // Validate input
  if (!marketPassId) {
    throw new functions.https.HttpsError('invalid-argument', 'Market pass ID is required')
  }

  const userId = context.auth.uid

  try {
    return await db.runTransaction(async (transaction) => {
      // Get market pass document
      const marketPassRef = db.collection('marketPass').doc(marketPassId)
      const marketPassDoc = await transaction.get(marketPassRef)

      if (!marketPassDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Market pass not found')
      }

      const marketPassData = marketPassDoc.data()

      // Verify ownership and active status
      if (marketPassData?.userRef?.id !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'You do not own this market pass')
      }

      if (marketPassData?.active !== true) {
        throw new functions.https.HttpsError('failed-precondition', 'Market pass is not active')
      }

      // Check if pass is expired
      if (marketPassData?.lastDay && marketPassData.lastDay.toDate() < new Date()) {
        throw new functions.https.HttpsError('failed-precondition', 'Cannot unlist expired pass')
      }

      // Get the parent private pass
      if (!marketPassData?.privatePassRef) {
        throw new functions.https.HttpsError('failed-precondition', 'Market pass does not have a parent private pass reference')
      }

      const privatePassRef = marketPassData.privatePassRef as admin.firestore.DocumentReference
      const privatePassDoc = await transaction.get(privatePassRef)

      if (!privatePassDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Parent private pass not found')
      }

      const privatePassData = privatePassDoc.data()

      // Verify parent pass ownership and active status
      if (privatePassData?.userRef?.id !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'You do not own the parent private pass')
      }

      if (privatePassData?.active !== true) {
        throw new functions.https.HttpsError('failed-precondition', 'Parent private pass is not active')
      }

      // Get the count to add back to parent pass
      const countToAddBack = marketPassData.count || 0

      // Add count back to parent private pass
      transaction.update(privatePassRef, {
        count: FieldValue.increment(countToAddBack),
        updatedAt: FieldValue.serverTimestamp()
      })

      // Delete the market pass
      transaction.delete(marketPassRef)

      // Create pass log entry (optional - unlist action)
      const passLogRef = db.collection('passLog').doc()
      const passLogData = {
        createdAt: FieldValue.serverTimestamp(),
        gym: marketPassData?.gymDisplayName,
        passName: marketPassData?.passName,
        count: countToAddBack,
        price: 0, // No price for unlist
        fromUserRef: db.collection('users').doc(userId),
        toUserRef: db.collection('users').doc(userId), // Same user
        action: 'unlist',
        participants: [userId]
      }

      transaction.set(passLogRef, passLogData)

      return {
        success: true,
        message: 'Pass unlisted successfully',
        countAddedBack: countToAddBack
      }
    })
  } catch (error) {
    console.error('Error in unlistPass:', error)

    if (error instanceof functions.https.HttpsError) {
      throw error
    }

    throw new functions.https.HttpsError('internal', 'Failed to unlist pass. Please try again.')
  }
})

// Helper function to sanitize Firestore data by removing circular references
const sanitizeFirestoreData = (data: any): any => {
  if (data === null || typeof data !== 'object') return data
  if (Array.isArray(data)) return data.map(sanitizeFirestoreData)

  const sanitized = { ...data }

  // Remove problematic Firestore fields that contain circular references
  delete sanitized.userRef
  delete sanitized.privatePassRef
  delete sanitized.fromUserRef
  delete sanitized.toUserRef

  // Convert Firestore Timestamps to ISO strings for better readability
  if (data.createdAt && typeof data.createdAt.toDate === 'function') {
    sanitized.createdAt = data.createdAt.toDate().toISOString()
  }
  if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
    sanitized.updatedAt = data.updatedAt.toDate().toISOString()
  }
  if (data.lastDay && typeof data.lastDay.toDate === 'function') {
    sanitized.lastDay = data.lastDay.toDate().toISOString()
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeFirestoreData(sanitized[key])
    }
  }

  return sanitized
}

// Debug function to check user passes
export const debugUserPasses = functions.https.onCall(async (data, context) => {
  console.log('debugUserPasses called with data:', JSON.stringify(data, null, 2))

  try {
    if (!context.auth) {
      console.error('No auth context found')
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    console.log('Auth context found, uid:', context.auth.uid)

    const { userId, gymId } = data
    console.log('Extracted data - userId:', userId, 'gymId:', gymId)

    // Only admins can debug
    const adminId = context.auth.uid
    console.log('Checking admin status for adminId:', adminId)

    const adminDoc = await db.collection('users').doc(adminId).get()
    console.log('Admin doc exists:', adminDoc.exists)

    const adminData = adminDoc.data()
    console.log('Admin data:', JSON.stringify(adminData, null, 2))

    if (!adminData?.isAdmin) {
      console.error('User is not admin')
      throw new functions.https.HttpsError('permission-denied', 'Only admins can debug')
    }

    console.log('Admin check passed, proceeding with debug')

    const targetUserRef = db.collection('users').doc(userId)
    console.log('Target user ref created for userId:', userId)

    // Get all private passes for user
    console.log('Querying all private passes for user')
    const allPrivatePasses = await db.collection('privatePass')
      .where('userRef', '==', targetUserRef)
      .get()

    console.log('All private passes query result - size:', allPrivatePasses.size)

    const passesInfo = allPrivatePasses.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }))

    console.log('Mapped passes info - count:', passesInfo.length)

    // Get active passes for gym
    console.log('Querying active passes for gym')
    const activeGymPasses = await db.collection('privatePass')
      .where('userRef', '==', targetUserRef)
      .where('active', '==', true)
      .where('gymId', '==', gymId)
      .get()

    console.log('Active gym passes query result - size:', activeGymPasses.size)

    const activeGymPassesInfo = activeGymPasses.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }))

    console.log('Mapped active gym passes info - count:', activeGymPassesInfo.length)

    // Sanitize data to remove circular references
    const result = {
      userId,
      gymId,
      allPrivatePassesCount: passesInfo.length,
      allPrivatePasses: passesInfo.map(item => ({
        id: item.id,
        data: sanitizeFirestoreData(item.data)
      })),
      activeGymPassesCount: activeGymPassesInfo.length,
      activeGymPasses: activeGymPassesInfo.map(item => ({
        id: item.id,
        data: sanitizeFirestoreData(item.data)
      }))
    }

    console.log('Returning result:', JSON.stringify(result, null, 2))
    return result

  } catch (error) {
    console.error('Error in debugUserPasses:', error)
    if (error instanceof functions.https.HttpsError) {
      throw error
    }
    throw new functions.https.HttpsError('internal', 'Failed to debug user passes. Please try again.')
  }
})

// Add admin pass function
export const addAdminPass = functions.https.onCall(async (data, context) => {
  console.log('addAdminPass called with data:', JSON.stringify(data, null, 2))

  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const {
    gymId,
    passName,
    count,
    price,
    duration
  } = data

  console.log('Extracted parameters:', { gymId, passName, count, price, duration })

  // Validate input
  if (!gymId || !passName || !count || typeof count !== 'number' || count <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid admin pass parameters')
  }

  if (typeof passName !== 'string' || passName.trim().length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Pass name is required and must be a non-empty string')
  }

  if (typeof price !== 'number' || price < 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Price must be a non-negative number')
  }

  if (typeof duration !== 'number' || duration <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Duration must be a positive number')
  }

  // Only admins can add admin passes
  const adminId = context.auth.uid
  const adminDoc = await db.collection('users').doc(adminId).get()
  const adminData = adminDoc.data()

  if (!adminData?.isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can add admin passes')
  }

  // Verify admin has permission for this gym
  if (adminData.adminGym !== gymId) {
    throw new functions.https.HttpsError('permission-denied', 'You can only add admin passes for your assigned gym')
  }

  try {
    // Get gym display name from existing admin pass or use gymId
    let gymDisplayName = gymId
    const existingAdminPassQuery = db.collection('adminPass')
      .where('gymId', '==', gymId)
      .limit(1)
    const existingPasses = await existingAdminPassQuery.get()

    if (!existingPasses.empty) {
      const existingPass = existingPasses.docs[0].data()
      if (existingPass) {
        gymDisplayName = existingPass.gymDisplayName || gymId
      }
    }

    // Create new admin pass
    const adminPassRef = db.collection('adminPass').doc()
    const adminPassData = {
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      gymDisplayName: gymDisplayName,
      gymId: gymId,
      passName: passName.trim(),
      count: count,
      price: price,
      duration: duration,
      active: true
    }

    console.log('Saving admin pass data:', JSON.stringify({
      ...adminPassData,
      createdAt: '[serverTimestamp]',
      updatedAt: '[serverTimestamp]'
    }, null, 2))

    await adminPassRef.set(adminPassData)

    return {
      success: true,
      message: 'Admin pass added successfully',
      adminPassId: adminPassRef.id
    }
  } catch (error) {
    console.error('Error in addAdminPass:', error)

    if (error instanceof functions.https.HttpsError) {
      throw error
    }

    throw new functions.https.HttpsError('internal', 'Failed to add admin pass. Please try again.')
  }
})

// Sell admin pass function
export const sellAdminPass = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const {
    adminPassId,
    recipientUserId
  } = data

  // Validate input
  if (!adminPassId || !recipientUserId) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid sell parameters')
  }

  // Only admins can sell admin passes
  const adminId = context.auth.uid
  const adminDoc = await db.collection('users').doc(adminId).get()
  const adminData = adminDoc.data()

  if (!adminData?.isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can sell admin passes')
  }

  try {
    return await db.runTransaction(async (transaction) => {
      // Get admin pass document
      const adminPassRef = db.collection('adminPass').doc(adminPassId)
      const adminPassDoc = await transaction.get(adminPassRef)

      if (!adminPassDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Admin pass not found')
      }

      const adminPassData = adminPassDoc.data()

      // Verify admin has permission for this gym
      if (adminData.adminGym !== adminPassData?.gymId) {
        throw new functions.https.HttpsError('permission-denied', 'You can only sell admin passes from your assigned gym')
      }

      // Verify pass is active
      if (adminPassData?.active !== true) {
        throw new functions.https.HttpsError('failed-precondition', 'Admin pass is not active')
      }

      // Get recipient user
      const recipientUserRef = db.collection('users').doc(recipientUserId)
      const recipientUserDoc = await transaction.get(recipientUserRef)

      if (!recipientUserDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Recipient user not found')
      }

      // Calculate new lastDay for transferred pass based on duration from now
      let newPassLastDay = null
      if (adminPassData?.duration && adminPassData.duration > 0) {
        const now = new Date()
        const newLastDay = new Date(now)
        newLastDay.setMonth(newLastDay.getMonth() + adminPassData.duration)
        newLastDay.setHours(23, 59, 59, 999) // End of day
        newPassLastDay = Timestamp.fromDate(newLastDay)
      }

      // Create new private pass for recipient
      const newPassRef = db.collection('privatePass').doc()
      const newPassData = {
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        gymDisplayName: adminPassData?.gymDisplayName,
        gymId: adminPassData?.gymId,
        passName: adminPassData?.passName,
        purchasePrice: adminPassData?.price || 0,
        purchaseCount: adminPassData?.count || 0,
        count: adminPassData?.count || 0,
        userRef: recipientUserRef,
        lastDay: newPassLastDay,
        active: true
      }

      transaction.set(newPassRef, newPassData)

      // Create pass log entry
      const passLogRef = db.collection('passLog').doc()
      const passLogData = {
        createdAt: FieldValue.serverTimestamp(),
        gym: adminPassData?.gymDisplayName,
        passName: adminPassData?.passName,
        count: adminPassData?.count || 0,
        price: adminPassData?.price || 0,
        fromUserRef: db.collection('users').doc(adminId),
        toUserRef: recipientUserRef,
        action: 'sell_admin',
        participants: [adminId, recipientUserId]
      }

      transaction.set(passLogRef, passLogData)

      return {
        success: true,
        message: 'Admin pass sold successfully',
        newPassId: newPassRef.id
      }
    })
  } catch (error) {
    console.error('Error in sellAdminPass:', error)

    if (error instanceof functions.https.HttpsError) {
      throw error
    }

    throw new functions.https.HttpsError('internal', 'Failed to sell admin pass. Please try again.')
  }
})

// Delete admin pass function
export const deleteAdminPass = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { adminPassId } = data

  // Validate input
  if (!adminPassId) {
    throw new functions.https.HttpsError('invalid-argument', 'Admin pass ID is required')
  }

  // Only admins can delete admin passes
  const adminId = context.auth.uid
  const adminDoc = await db.collection('users').doc(adminId).get()
  const adminData = adminDoc.data()

  if (!adminData?.isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can delete admin passes')
  }

  try {
    return await db.runTransaction(async (transaction) => {
      // Get admin pass document
      const adminPassRef = db.collection('adminPass').doc(adminPassId)
      const adminPassDoc = await transaction.get(adminPassRef)

      if (!adminPassDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Admin pass not found')
      }

      const adminPassData = adminPassDoc.data()

      // Verify admin has permission for this gym
      if (adminData.adminGym !== adminPassData?.gymId) {
        throw new functions.https.HttpsError('permission-denied', 'You can only delete admin passes from your assigned gym')
      }

      // Delete the admin pass permanently
      transaction.delete(adminPassRef)

      return {
        success: true,
        message: 'Admin pass deleted successfully'
      }
    })
  } catch (error) {
    console.error('Error in deleteAdminPass:', error)

    if (error instanceof functions.https.HttpsError) {
      throw error
    }

    throw new functions.https.HttpsError('internal', 'Failed to delete admin pass. Please try again.')
  }
})

// Consume pass function
export const consumePass = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const {
    userId,
    passId,
    count
  } = data

  // Validate input
  if (!userId || !passId || !count || typeof count !== 'number' || count <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid consume parameters')
  }

  // Only admins can consume passes
  const adminId = context.auth.uid
  const adminDoc = await db.collection('users').doc(adminId).get()
  const adminData = adminDoc.data()

  if (!adminData?.isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can consume passes')
  }

  try {
    return await db.runTransaction(async (transaction) => {
      // Get target user
      const targetUserRef = db.collection('users').doc(userId)
      const targetUserDoc = await transaction.get(targetUserRef)

      if (!targetUserDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Target user not found')
      }

      // Get the specific private pass to consume from
      const privatePassRef = db.collection('privatePass').doc(passId)
      const privatePassDoc = await transaction.get(privatePassRef)

      if (!privatePassDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Private pass not found')
      }

      const privatePassData = privatePassDoc.data()

      // Verify pass ownership
      if (privatePassData?.userRef?.id !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Pass does not belong to the user')
      }

      // Check if pass is active
      if (privatePassData?.active !== true) {
        throw new functions.https.HttpsError('failed-precondition', 'Pass is not active')
      }

      // Check if pass is expired
      if (privatePassData?.lastDay && privatePassData.lastDay.toDate() < new Date()) {
        throw new functions.https.HttpsError('failed-precondition', 'Cannot consume expired pass')
      }

      // Check if sufficient count is available
      if (privatePassData?.count < count) {
        throw new functions.https.HttpsError('failed-precondition', `Insufficient pass count. Available: ${privatePassData.count}, Requested: ${count}`)
      }

      // Calculate new count
      const newCount = privatePassData.count - count

      // Update the pass count
      transaction.update(privatePassRef, {
        count: newCount,
        updatedAt: FieldValue.serverTimestamp()
      })

      // Create pass log entry
      const passLogRef = db.collection('passLog').doc()
      const passLogData = {
        createdAt: FieldValue.serverTimestamp(),
        gym: privatePassData?.gymDisplayName || privatePassData?.gymId || 'Unknown Gym',
        passName: privatePassData?.passName,
        count: count,
        price: 0, // Consumed passes don't have a price
        fromUserRef: targetUserRef,
        toUserRef: targetUserRef, // Same user since it's consumption
        action: 'consume',
        participants: [userId]
      }

      transaction.set(passLogRef, passLogData)

      return {
        success: true,
        message: `Successfully consumed ${count} pass(es) from ${privatePassData?.gymDisplayName || privatePassData?.gymId}`,
        consumedCount: count,
        remainingCount: newCount
      }
    })
  } catch (error) {
    console.error('Error in consumePass:', error)

    if (error instanceof functions.https.HttpsError) {
      throw error
    }

    throw new functions.https.HttpsError('internal', 'Failed to consume pass. Please try again.')
  }
})
