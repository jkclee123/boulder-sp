import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Consume pass function
export const consumePass = functions.https.onCall(async (data, context) => {
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
            if (!privatePassData) {
                throw new functions.https.HttpsError('not-found', 'Private pass data is empty or invalid');
            }
            // Verify pass ownership
            if (((_a = privatePassData.userRef) === null || _a === void 0 ? void 0 : _a.id) !== userId) {
                throw new functions.https.HttpsError('permission-denied', 'Pass does not belong to the user');
            }
            // Check if pass is active
            if (privatePassData.active !== true) {
                throw new functions.https.HttpsError('failed-precondition', 'Pass is not active');
            }
            // Check if pass is expired
            if (privatePassData.lastDay && privatePassData.lastDay.toDate() < new Date()) {
                throw new functions.https.HttpsError('failed-precondition', 'Cannot consume expired pass');
            }
            // Check if sufficient count is available
            if (privatePassData.count < count) {
                throw new functions.https.HttpsError('failed-precondition', `Insufficient pass count. Available: ${privatePassData.count}, Requested: ${count}`);
            }
            // Calculate new count
            const newCount = privatePassData.count - count;
            // Update the pass count
            transaction.update(privatePassRef, {
                count: newCount,
                updatedAt: FieldValue.serverTimestamp()
            });
            // Create pass log entry
            const passLogRef = db.collection('passLog').doc();
            const passLogData = {
                createdAt: FieldValue.serverTimestamp(),
                gymDisplayName: privatePassData.gymDisplayName || 'Unknown Gym',
                passName: privatePassData === null || privatePassData === void 0 ? void 0 : privatePassData.passName,
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
