import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// List private pass for market function
export const listPassForMarket = functions.https.onCall(async (data, context) => {
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
            if (!privatePassData) {
                throw new functions.https.HttpsError('not-found', 'Private pass data is empty or invalid');
            }
            // Verify ownership and active status
            if (((_a = privatePassData.userRef) === null || _a === void 0 ? void 0 : _a.id) !== userId) {
                throw new functions.https.HttpsError('permission-denied', 'You do not own this pass');
            }
            if (privatePassData.active !== true) {
                throw new functions.https.HttpsError('failed-precondition', 'Pass is not active');
            }
            // Check if pass is expired
            if (privatePassData.lastDay && privatePassData.lastDay.toDate() < new Date()) {
                throw new functions.https.HttpsError('failed-precondition', 'Cannot list expired pass for sale');
            }
            // Check if count is sufficient
            if (privatePassData.count < count) {
                throw new functions.https.HttpsError('failed-precondition', `Insufficient pass count. Available: ${privatePassData.count}, Requested: ${count}`);
            }
            // Create new market pass
            const marketPassRef = db.collection('marketPass').doc();
            const marketPassData = {
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                gymDisplayName: privatePassData.gymDisplayName,
                gymId: privatePassData.gymId,
                passName: privatePassData.passName,
                price: price,
                count: count,
                userRef: userRef,
                privatePassRef: privatePassRef,
                remarks: remarks || '',
                lastDay: privatePassData.lastDay,
                active: true
            };
            transaction.set(marketPassRef, marketPassData);
            // Reduce count from private pass
            transaction.update(privatePassRef, {
                count: FieldValue.increment(-count),
                updatedAt: FieldValue.serverTimestamp()
            });
            // Create pass log entry
            const passLogRef = db.collection('passLog').doc();
            const passLogData = {
                createdAt: FieldValue.serverTimestamp(),
                gym: privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.gymDisplayName,
                passName: privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.passName,
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
