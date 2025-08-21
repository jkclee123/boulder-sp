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
exports.listPassForMarket = exports.transfer = exports.getUserProfile = exports.updateUserProfile = void 0;
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
                    newPassLastDay = admin.firestore.Timestamp.fromDate(newLastDay);
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
//# sourceMappingURL=index.js.map