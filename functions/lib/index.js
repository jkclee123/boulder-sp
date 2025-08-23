"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumePass = exports.deactivateAdminPass = exports.transferAdminPass = exports.addAdminPass = exports.debugUserPasses = exports.unlistPass = exports.listPassForMarket = exports.transfer = exports.getUserProfile = exports.updateUserProfile = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
admin.initializeApp();
const db = admin.firestore();
// Update user profile
exports.updateUserProfile = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { name, phoneNumber, telegramId, gymMemberId } = data;
    const uid = context.auth.uid;
    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Name is required and must be a non-empty string');
    }
    if (phoneNumber && typeof phoneNumber !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Phone number must be a string');
    }
    if (telegramId && typeof telegramId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Telegram ID must be a string');
    }
    if (gymMemberId && typeof gymMemberId !== 'object') {
        throw new functions.https.HttpsError('invalid-argument', 'Gym member ID must be an object');
    }
    try {
        // Update user profile in Firestore - using 'users' collection to match security rules
        await db.collection('users').doc(uid).update({
            name: name.trim(),
            phoneNumber: (phoneNumber === null || phoneNumber === void 0 ? void 0 : phoneNumber.trim()) || null,
            telegramId: (telegramId === null || telegramId === void 0 ? void 0 : telegramId.trim()) || null,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            gymMemberId: gymMemberId || null,
        });
        return { success: true };
    }
    catch (error) {
        console.error('Error updating user profile:', error);
        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes('permission-denied')) {
                throw new functions.https.HttpsError('permission-denied', 'You do not have permission to update this profile');
            }
            else if (error.message.includes('not-found')) {
                throw new functions.https.HttpsError('not-found', 'User profile not found');
            }
            else if (error.message.includes('unavailable')) {
                throw new functions.https.HttpsError('unavailable', 'Firestore is temporarily unavailable');
            }
        }
        throw new functions.https.HttpsError('internal', 'Failed to update profile. Please try again.');
    }
});
// Get user profile
exports.getUserProfile = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const uid = context.auth.uid;
    try {
        // Use 'users' collection to match security rules
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User profile not found');
        }
        const userData = userDoc.data();
        return {
            uid: userData === null || userData === void 0 ? void 0 : userData.uid,
            email: userData === null || userData === void 0 ? void 0 : userData.email,
            name: userData === null || userData === void 0 ? void 0 : userData.name,
            phoneNumber: userData === null || userData === void 0 ? void 0 : userData.phoneNumber,
            telegramId: userData === null || userData === void 0 ? void 0 : userData.telegramId,
            createdAt: userData === null || userData === void 0 ? void 0 : userData.createdAt,
            updatedAt: userData === null || userData === void 0 ? void 0 : userData.updatedAt,
            gymMemberId: (userData === null || userData === void 0 ? void 0 : userData.gymMemberId) || {},
            isAdmin: (userData === null || userData === void 0 ? void 0 : userData.isAdmin) || false,
            adminGym: userData === null || userData === void 0 ? void 0 : userData.adminGym,
        };
    }
    catch (error) {
        console.error('Error getting user profile:', error);
        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes('permission-denied')) {
                throw new functions.https.HttpsError('permission-denied', 'You do not have permission to read this profile');
            }
            else if (error.message.includes('unavailable')) {
                throw new functions.https.HttpsError('unavailable', 'Firestore is temporarily unavailable');
            }
        }
        throw new functions.https.HttpsError('internal', 'Failed to get profile. Please try again.');
    }
});
// Transfer pass function
exports.transfer = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { fromUserId, toUserId, passId, passType, count, price } = data;
    // Validate input
    if (!fromUserId || !toUserId || !passId || !passType || !count || typeof count !== 'number' || count <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid transfer parameters');
    }
    if (fromUserId !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'You can only transfer your own passes');
    }
    if (fromUserId === toUserId) {
        throw new functions.https.HttpsError('invalid-argument', 'Cannot transfer to yourself');
    }
    const transferPrice = price || 0;
    try {
        return await db.runTransaction(async (transaction) => {
            var _a;
            // Get source pass document
            let sourcePassRef;
            let sourcePassData;
            if (passType === 'private') {
                sourcePassRef = db.collection('privatePass').doc(passId);
            }
            else if (passType === 'market') {
                sourcePassRef = db.collection('marketPass').doc(passId);
            }
            else if (passType === 'admin') {
                sourcePassRef = db.collection('adminPass').doc(passId);
            }
            else {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid pass type');
            }
            const sourcePassDoc = await transaction.get(sourcePassRef);
            if (!sourcePassDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Source pass not found');
            }
            sourcePassData = sourcePassDoc.data();
            // Verify ownership and active status
            if (((_a = sourcePassData === null || sourcePassData === void 0 ? void 0 : sourcePassData.userRef) === null || _a === void 0 ? void 0 : _a.id) !== fromUserId) {
                throw new functions.https.HttpsError('permission-denied', 'You do not own this pass');
            }
            if ((sourcePassData === null || sourcePassData === void 0 ? void 0 : sourcePassData.active) !== true) {
                throw new functions.https.HttpsError('failed-precondition', 'Pass is not active');
            }
            // Check if pass is expired
            if ((sourcePassData === null || sourcePassData === void 0 ? void 0 : sourcePassData.lastDay) && sourcePassData.lastDay.toDate() < new Date()) {
                throw new functions.https.HttpsError('failed-precondition', 'Cannot transfer expired pass');
            }
            // Check if count is sufficient
            if ((sourcePassData === null || sourcePassData === void 0 ? void 0 : sourcePassData.count) < count) {
                throw new functions.https.HttpsError('failed-precondition', `Insufficient pass count. Available: ${sourcePassData.count}, Requested: ${count}`);
            }
            // Get recipient user
            const toUserRef = db.collection('users').doc(toUserId);
            const toUserDoc = await transaction.get(toUserRef);
            if (!toUserDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Recipient user not found');
            }
            // Calculate lastDay for new pass
            let newPassLastDay = null;
            if (passType === 'admin') {
                // For admin passes, calculate new lastDay based on duration from now
                const duration = (sourcePassData === null || sourcePassData === void 0 ? void 0 : sourcePassData.duration) || 0;
                if (duration > 0) {
                    // Set lastDay to end of day at 23:59:59 HKT (UTC+8)
                    const now = new Date();
                    const newLastDay = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
                    newLastDay.setHours(23, 59, 59, 999); // End of day
                    newPassLastDay = firestore_1.Timestamp.fromDate(newLastDay);
                }
            }
            else {
                // For private and market passes, preserve the original lastDay
                if ((sourcePassData === null || sourcePassData === void 0 ? void 0 : sourcePassData.lastDay) && typeof sourcePassData.lastDay.toDate === 'function') {
                    newPassLastDay = sourcePassData.lastDay;
                }
            }
            // Create new private pass for recipient
            const newPassRef = db.collection('privatePass').doc();
            const newPassData = {
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                gymDisplayName: sourcePassData === null || sourcePassData === void 0 ? void 0 : sourcePassData.gymDisplayName,
                gymId: sourcePassData === null || sourcePassData === void 0 ? void 0 : sourcePassData.gymId,
                purchasePrice: transferPrice,
                purchaseCount: count,
                count: count,
                userRef: toUserRef,
                lastDay: newPassLastDay,
                active: true
            };
            transaction.set(newPassRef, newPassData);
            // Reduce count from source pass (unless it's an admin pass)
            if (passType !== 'admin') {
                transaction.update(sourcePassRef, {
                    count: firestore_1.FieldValue.increment(-count),
                    updatedAt: firestore_1.FieldValue.serverTimestamp()
                });
            }
            // Create pass log entry
            const passLogRef = db.collection('passLog').doc();
            const passLogData = {
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                gym: sourcePassData === null || sourcePassData === void 0 ? void 0 : sourcePassData.gymDisplayName,
                count: count,
                price: transferPrice,
                fromUserRef: db.collection('users').doc(fromUserId),
                toUserRef: toUserRef,
                action: 'transfer',
                participants: [fromUserId, toUserId]
            };
            transaction.set(passLogRef, passLogData);
            return {
                success: true,
                message: 'Transfer completed successfully',
                newPassId: newPassRef.id
            };
        });
    }
    catch (error) {
        console.error('Error in transfer:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Transfer failed. Please try again.');
    }
});
// List private pass for market function
exports.listPassForMarket = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { privatePassId, count, price, remarks } = data;
    // Validate input
    if (!privatePassId || !count || typeof count !== 'number' || count <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid market listing parameters');
    }
    if (typeof price !== 'number' || price <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Price must be a positive number');
    }
    const userId = context.auth.uid;
    try {
        return await db.runTransaction(async (transaction) => {
            var _a;
            // Get user document to check telegramId
            const userRef = db.collection('users').doc(userId);
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'User not found');
            }
            const userData = userDoc.data();
            if (!(userData === null || userData === void 0 ? void 0 : userData.telegramId)) {
                throw new functions.https.HttpsError('failed-precondition', 'You must set your Telegram ID before listing passes for sale');
            }
            // Get private pass document
            const privatePassRef = db.collection('privatePass').doc(privatePassId);
            const privatePassDoc = await transaction.get(privatePassRef);
            if (!privatePassDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Private pass not found');
            }
            const privatePassData = privatePassDoc.data();
            // Verify ownership and active status
            if (((_a = privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.userRef) === null || _a === void 0 ? void 0 : _a.id) !== userId) {
                throw new functions.https.HttpsError('permission-denied', 'You do not own this pass');
            }
            if ((privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.active) !== true) {
                throw new functions.https.HttpsError('failed-precondition', 'Pass is not active');
            }
            // Check if pass is expired
            if ((privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.lastDay) && privatePassData.lastDay.toDate() < new Date()) {
                throw new functions.https.HttpsError('failed-precondition', 'Cannot list expired pass for sale');
            }
            // Check if count is sufficient
            if ((privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.count) < count) {
                throw new functions.https.HttpsError('failed-precondition', `Insufficient pass count. Available: ${privatePassData.count}, Requested: ${count}`);
            }
            // Create new market pass
            const marketPassRef = db.collection('marketPass').doc();
            const marketPassData = {
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                gymDisplayName: privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.gymDisplayName,
                gymId: privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.gymId,
                price: price,
                count: count,
                userRef: userRef,
                privatePassRef: privatePassRef,
                remarks: remarks || '',
                lastDay: privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.lastDay,
                active: true
            };
            transaction.set(marketPassRef, marketPassData);
            // Reduce count from private pass
            transaction.update(privatePassRef, {
                count: firestore_1.FieldValue.increment(-count),
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
            // Create pass log entry
            const passLogRef = db.collection('passLog').doc();
            const passLogData = {
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                gym: privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.gymDisplayName,
                count: count,
                price: price,
                fromUserRef: userRef,
                toUserRef: userRef,
                action: 'market',
                participants: [userId]
            };
            transaction.set(passLogRef, passLogData);
            return {
                success: true,
                message: 'Pass listed for sale successfully',
                marketPassId: marketPassRef.id
            };
        });
    }
    catch (error) {
        console.error('Error in listPassForMarket:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to list pass for sale. Please try again.');
    }
});
// Unlist market pass function
exports.unlistPass = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { marketPassId } = data;
    // Validate input
    if (!marketPassId) {
        throw new functions.https.HttpsError('invalid-argument', 'Market pass ID is required');
    }
    const userId = context.auth.uid;
    try {
        return await db.runTransaction(async (transaction) => {
            var _a, _b;
            // Get market pass document
            const marketPassRef = db.collection('marketPass').doc(marketPassId);
            const marketPassDoc = await transaction.get(marketPassRef);
            if (!marketPassDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Market pass not found');
            }
            const marketPassData = marketPassDoc.data();
            // Verify ownership and active status
            if (((_a = marketPassData === null || marketPassData === void 0 ? void 0 : marketPassData.userRef) === null || _a === void 0 ? void 0 : _a.id) !== userId) {
                throw new functions.https.HttpsError('permission-denied', 'You do not own this market pass');
            }
            if ((marketPassData === null || marketPassData === void 0 ? void 0 : marketPassData.active) !== true) {
                throw new functions.https.HttpsError('failed-precondition', 'Market pass is not active');
            }
            // Check if pass is expired
            if ((marketPassData === null || marketPassData === void 0 ? void 0 : marketPassData.lastDay) && marketPassData.lastDay.toDate() < new Date()) {
                throw new functions.https.HttpsError('failed-precondition', 'Cannot unlist expired pass');
            }
            // Get the parent private pass
            if (!(marketPassData === null || marketPassData === void 0 ? void 0 : marketPassData.privatePassRef)) {
                throw new functions.https.HttpsError('failed-precondition', 'Market pass does not have a parent private pass reference');
            }
            const privatePassRef = marketPassData.privatePassRef;
            const privatePassDoc = await transaction.get(privatePassRef);
            if (!privatePassDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Parent private pass not found');
            }
            const privatePassData = privatePassDoc.data();
            // Verify parent pass ownership and active status
            if (((_b = privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.userRef) === null || _b === void 0 ? void 0 : _b.id) !== userId) {
                throw new functions.https.HttpsError('permission-denied', 'You do not own the parent private pass');
            }
            if ((privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.active) !== true) {
                throw new functions.https.HttpsError('failed-precondition', 'Parent private pass is not active');
            }
            // Get the count to add back to parent pass
            const countToAddBack = marketPassData.count || 0;
            // Add count back to parent private pass
            transaction.update(privatePassRef, {
                count: firestore_1.FieldValue.increment(countToAddBack),
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
            // Delete the market pass
            transaction.delete(marketPassRef);
            // Create pass log entry (optional - unlist action)
            const passLogRef = db.collection('passLog').doc();
            const passLogData = {
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                gym: marketPassData === null || marketPassData === void 0 ? void 0 : marketPassData.gymDisplayName,
                count: countToAddBack,
                price: 0,
                fromUserRef: db.collection('users').doc(userId),
                toUserRef: db.collection('users').doc(userId),
                action: 'unlist',
                participants: [userId]
            };
            transaction.set(passLogRef, passLogData);
            return {
                success: true,
                message: 'Pass unlisted successfully',
                countAddedBack: countToAddBack
            };
        });
    }
    catch (error) {
        console.error('Error in unlistPass:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to unlist pass. Please try again.');
    }
});
// Helper function to sanitize Firestore data by removing circular references
const sanitizeFirestoreData = (data) => {
    if (data === null || typeof data !== 'object')
        return data;
    if (Array.isArray(data))
        return data.map(sanitizeFirestoreData);
    const sanitized = Object.assign({}, data);
    // Remove problematic Firestore fields that contain circular references
    delete sanitized.userRef;
    delete sanitized.privatePassRef;
    delete sanitized.fromUserRef;
    delete sanitized.toUserRef;
    // Convert Firestore Timestamps to ISO strings for better readability
    if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        sanitized.createdAt = data.createdAt.toDate().toISOString();
    }
    if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
        sanitized.updatedAt = data.updatedAt.toDate().toISOString();
    }
    if (data.lastDay && typeof data.lastDay.toDate === 'function') {
        sanitized.lastDay = data.lastDay.toDate().toISOString();
    }
    // Recursively sanitize nested objects
    for (const key in sanitized) {
        if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeFirestoreData(sanitized[key]);
        }
    }
    return sanitized;
};
// Debug function to check user passes
exports.debugUserPasses = functions.https.onCall(async (data, context) => {
    console.log('debugUserPasses called with data:', JSON.stringify(data, null, 2));
    try {
        if (!context.auth) {
            console.error('No auth context found');
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        console.log('Auth context found, uid:', context.auth.uid);
        const { userId, gymId } = data;
        console.log('Extracted data - userId:', userId, 'gymId:', gymId);
        // Only admins can debug
        const adminId = context.auth.uid;
        console.log('Checking admin status for adminId:', adminId);
        const adminDoc = await db.collection('users').doc(adminId).get();
        console.log('Admin doc exists:', adminDoc.exists);
        const adminData = adminDoc.data();
        console.log('Admin data:', JSON.stringify(adminData, null, 2));
        if (!(adminData === null || adminData === void 0 ? void 0 : adminData.isAdmin)) {
            console.error('User is not admin');
            throw new functions.https.HttpsError('permission-denied', 'Only admins can debug');
        }
        console.log('Admin check passed, proceeding with debug');
        const targetUserRef = db.collection('users').doc(userId);
        console.log('Target user ref created for userId:', userId);
        // Get all private passes for user
        console.log('Querying all private passes for user');
        const allPrivatePasses = await db.collection('privatePass')
            .where('userRef', '==', targetUserRef)
            .get();
        console.log('All private passes query result - size:', allPrivatePasses.size);
        const passesInfo = allPrivatePasses.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
        }));
        console.log('Mapped passes info - count:', passesInfo.length);
        // Get active passes for gym
        console.log('Querying active passes for gym');
        const activeGymPasses = await db.collection('privatePass')
            .where('userRef', '==', targetUserRef)
            .where('active', '==', true)
            .where('gymId', '==', gymId)
            .get();
        console.log('Active gym passes query result - size:', activeGymPasses.size);
        const activeGymPassesInfo = activeGymPasses.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
        }));
        console.log('Mapped active gym passes info - count:', activeGymPassesInfo.length);
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
        };
        console.log('Returning result:', JSON.stringify(result, null, 2));
        return result;
    }
    catch (error) {
        console.error('Error in debugUserPasses:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to debug user passes. Please try again.');
    }
});
// Add admin pass function
exports.addAdminPass = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { gymId, count, price, duration } = data;
    // Validate input
    if (!gymId || !count || typeof count !== 'number' || count <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid admin pass parameters');
    }
    if (typeof price !== 'number' || price < 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Price must be a non-negative number');
    }
    if (typeof duration !== 'number' || duration <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Duration must be a positive number');
    }
    // Only admins can add admin passes
    const adminId = context.auth.uid;
    const adminDoc = await db.collection('users').doc(adminId).get();
    const adminData = adminDoc.data();
    if (!(adminData === null || adminData === void 0 ? void 0 : adminData.isAdmin)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can add admin passes');
    }
    // Verify admin has permission for this gym
    if (adminData.adminGym !== gymId) {
        throw new functions.https.HttpsError('permission-denied', 'You can only add admin passes for your assigned gym');
    }
    try {
        // Calculate lastDay based on duration
        const now = new Date();
        const lastDay = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
        lastDay.setHours(23, 59, 59, 999); // End of day
        // Get gym display name from existing admin pass or use gymId
        let gymDisplayName = gymId;
        const existingAdminPassQuery = db.collection('adminPass')
            .where('gymId', '==', gymId)
            .limit(1);
        const existingPasses = await existingAdminPassQuery.get();
        if (!existingPasses.empty) {
            const existingPass = existingPasses.docs[0].data();
            if (existingPass) {
                gymDisplayName = existingPass.gymDisplayName || gymId;
            }
        }
        // Create new admin pass
        const adminPassRef = db.collection('adminPass').doc();
        const adminPassData = {
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            gymDisplayName: gymDisplayName,
            gymId: gymId,
            count: count,
            price: price,
            duration: duration,
            lastDay: firestore_1.Timestamp.fromDate(lastDay),
            active: true
        };
        await adminPassRef.set(adminPassData);
        return {
            success: true,
            message: 'Admin pass added successfully',
            adminPassId: adminPassRef.id
        };
    }
    catch (error) {
        console.error('Error in addAdminPass:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to add admin pass. Please try again.');
    }
});
// Transfer admin pass function
exports.transferAdminPass = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { adminPassId, recipientUserId, count, price } = data;
    // Validate input
    if (!adminPassId || !recipientUserId || !count || typeof count !== 'number' || count <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid transfer parameters');
    }
    if (typeof price !== 'number' || price < 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Price must be a non-negative number');
    }
    // Only admins can transfer admin passes
    const adminId = context.auth.uid;
    const adminDoc = await db.collection('users').doc(adminId).get();
    const adminData = adminDoc.data();
    if (!(adminData === null || adminData === void 0 ? void 0 : adminData.isAdmin)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can transfer admin passes');
    }
    try {
        return await db.runTransaction(async (transaction) => {
            // Get admin pass document
            const adminPassRef = db.collection('adminPass').doc(adminPassId);
            const adminPassDoc = await transaction.get(adminPassRef);
            if (!adminPassDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Admin pass not found');
            }
            const adminPassData = adminPassDoc.data();
            // Verify admin has permission for this gym
            if (adminData.adminGym !== (adminPassData === null || adminPassData === void 0 ? void 0 : adminPassData.gymId)) {
                throw new functions.https.HttpsError('permission-denied', 'You can only transfer admin passes from your assigned gym');
            }
            // Verify pass is active
            if ((adminPassData === null || adminPassData === void 0 ? void 0 : adminPassData.active) !== true) {
                throw new functions.https.HttpsError('failed-precondition', 'Admin pass is not active');
            }
            // Check if pass is expired
            if ((adminPassData === null || adminPassData === void 0 ? void 0 : adminPassData.lastDay) && adminPassData.lastDay.toDate() < new Date()) {
                throw new functions.https.HttpsError('failed-precondition', 'Cannot transfer expired admin pass');
            }
            // Check if count is sufficient
            if ((adminPassData === null || adminPassData === void 0 ? void 0 : adminPassData.count) < count) {
                throw new functions.https.HttpsError('failed-precondition', `Insufficient pass count. Available: ${adminPassData.count}, Requested: ${count}`);
            }
            // Get recipient user
            const recipientUserRef = db.collection('users').doc(recipientUserId);
            const recipientUserDoc = await transaction.get(recipientUserRef);
            if (!recipientUserDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Recipient user not found');
            }
            // Calculate new lastDay for transferred pass based on duration from now
            let newPassLastDay = null;
            if ((adminPassData === null || adminPassData === void 0 ? void 0 : adminPassData.duration) && adminPassData.duration > 0) {
                const now = new Date();
                const newLastDay = new Date(now.getTime() + adminPassData.duration * 24 * 60 * 60 * 1000);
                newLastDay.setHours(23, 59, 59, 999); // End of day
                newPassLastDay = firestore_1.Timestamp.fromDate(newLastDay);
            }
            else if (adminPassData === null || adminPassData === void 0 ? void 0 : adminPassData.lastDay) {
                newPassLastDay = adminPassData.lastDay;
            }
            // Create new private pass for recipient
            const newPassRef = db.collection('privatePass').doc();
            const newPassData = {
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                gymDisplayName: adminPassData === null || adminPassData === void 0 ? void 0 : adminPassData.gymDisplayName,
                gymId: adminPassData === null || adminPassData === void 0 ? void 0 : adminPassData.gymId,
                purchasePrice: price,
                purchaseCount: count,
                count: count,
                userRef: recipientUserRef,
                lastDay: newPassLastDay,
                active: true
            };
            transaction.set(newPassRef, newPassData);
            // Reduce count from admin pass
            transaction.update(adminPassRef, {
                count: firestore_1.FieldValue.increment(-count),
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
            // Create pass log entry
            const passLogRef = db.collection('passLog').doc();
            const passLogData = {
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                gym: adminPassData === null || adminPassData === void 0 ? void 0 : adminPassData.gymDisplayName,
                count: count,
                price: price,
                fromUserRef: db.collection('users').doc(adminId),
                toUserRef: recipientUserRef,
                action: 'transfer_admin',
                participants: [adminId, recipientUserId]
            };
            transaction.set(passLogRef, passLogData);
            return {
                success: true,
                message: 'Admin pass transferred successfully',
                newPassId: newPassRef.id
            };
        });
    }
    catch (error) {
        console.error('Error in transferAdminPass:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to transfer admin pass. Please try again.');
    }
});
// Deactivate admin pass function
exports.deactivateAdminPass = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { adminPassId } = data;
    // Validate input
    if (!adminPassId) {
        throw new functions.https.HttpsError('invalid-argument', 'Admin pass ID is required');
    }
    // Only admins can deactivate admin passes
    const adminId = context.auth.uid;
    const adminDoc = await db.collection('users').doc(adminId).get();
    const adminData = adminDoc.data();
    if (!(adminData === null || adminData === void 0 ? void 0 : adminData.isAdmin)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can deactivate admin passes');
    }
    try {
        return await db.runTransaction(async (transaction) => {
            // Get admin pass document
            const adminPassRef = db.collection('adminPass').doc(adminPassId);
            const adminPassDoc = await transaction.get(adminPassRef);
            if (!adminPassDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Admin pass not found');
            }
            const adminPassData = adminPassDoc.data();
            // Verify admin has permission for this gym
            if (adminData.adminGym !== (adminPassData === null || adminPassData === void 0 ? void 0 : adminPassData.gymId)) {
                throw new functions.https.HttpsError('permission-denied', 'You can only deactivate admin passes from your assigned gym');
            }
            // Verify pass is currently active
            if ((adminPassData === null || adminPassData === void 0 ? void 0 : adminPassData.active) !== true) {
                throw new functions.https.HttpsError('failed-precondition', 'Admin pass is already deactivated');
            }
            // Deactivate the admin pass
            transaction.update(adminPassRef, {
                active: false,
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
            return {
                success: true,
                message: 'Admin pass deactivated successfully'
            };
        });
    }
    catch (error) {
        console.error('Error in deactivateAdminPass:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to deactivate admin pass. Please try again.');
    }
});
// Consume pass function
exports.consumePass = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { userId, passId, count } = data;
    // Validate input
    if (!userId || !passId || !count || typeof count !== 'number' || count <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid consume parameters');
    }
    // Only admins can consume passes
    const adminId = context.auth.uid;
    const adminDoc = await db.collection('users').doc(adminId).get();
    const adminData = adminDoc.data();
    if (!(adminData === null || adminData === void 0 ? void 0 : adminData.isAdmin)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can consume passes');
    }
    try {
        return await db.runTransaction(async (transaction) => {
            var _a;
            // Get target user
            const targetUserRef = db.collection('users').doc(userId);
            const targetUserDoc = await transaction.get(targetUserRef);
            if (!targetUserDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Target user not found');
            }
            // Get the specific private pass to consume from
            const privatePassRef = db.collection('privatePass').doc(passId);
            const privatePassDoc = await transaction.get(privatePassRef);
            if (!privatePassDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Private pass not found');
            }
            const privatePassData = privatePassDoc.data();
            // Verify pass ownership
            if (((_a = privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.userRef) === null || _a === void 0 ? void 0 : _a.id) !== userId) {
                throw new functions.https.HttpsError('permission-denied', 'Pass does not belong to the user');
            }
            // Check if pass is active
            if ((privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.active) !== true) {
                throw new functions.https.HttpsError('failed-precondition', 'Pass is not active');
            }
            // Check if pass is expired
            if ((privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.lastDay) && privatePassData.lastDay.toDate() < new Date()) {
                throw new functions.https.HttpsError('failed-precondition', 'Cannot consume expired pass');
            }
            // Check if sufficient count is available
            if ((privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.count) < count) {
                throw new functions.https.HttpsError('failed-precondition', `Insufficient pass count. Available: ${privatePassData.count}, Requested: ${count}`);
            }
            // Calculate new count
            const newCount = privatePassData.count - count;
            // Update the pass count
            transaction.update(privatePassRef, {
                count: newCount,
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
            // Create pass log entry
            const passLogRef = db.collection('passLog').doc();
            const passLogData = {
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                gym: (privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.gymDisplayName) || (privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.gymId) || 'Unknown Gym',
                count: count,
                price: 0,
                fromUserRef: targetUserRef,
                toUserRef: targetUserRef,
                action: 'consume',
                participants: [userId]
            };
            transaction.set(passLogRef, passLogData);
            return {
                success: true,
                message: `Successfully consumed ${count} pass(es) from ${(privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.gymDisplayName) || (privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.gymId)}`,
                consumedCount: count,
                remainingCount: newCount
            };
        });
    }
    catch (error) {
        console.error('Error in consumePass:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to consume pass. Please try again.');
    }
});
//# sourceMappingURL=index.js.map