import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { isPassExpired } from './utils';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Consume pass function
export const consumePass = functions.https.onCall(async (request) => {
    // Check if user is authenticated
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { userId, passId, count } = request.data;
    // Validate input
    if (!userId || !passId || !count || typeof count !== 'number' || count <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid consume parameters');
    }
    // Only admins can consume passes
    const adminId = request.auth.uid;
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

            // Try to find pass in privatePass collection first
            let passRef = db.collection('privatePass').doc(passId);
            let passDoc = await transaction.get(passRef);
            let passType = 'private';

            // If not found in privatePass, try marketPass collection
            if (!passDoc.exists) {
                passRef = db.collection('marketPass').doc(passId);
                passDoc = await transaction.get(passRef);
                passType = 'market';

                if (!passDoc.exists) {
                    throw new functions.https.HttpsError('not-found', 'Pass not found in private or market collections');
                }
            }

            const passData = passDoc.data();
            if (!passData) {
                throw new functions.https.HttpsError('not-found', 'Pass data is empty or invalid');
            }

            // Verify admin gym matches pass gym
            if (!adminData?.adminGym || adminData.adminGym !== passData.gymId) {
                throw new functions.https.HttpsError('permission-denied', 'Admin can only consume passes from their assigned gym');
            }

            // Verify pass ownership
            if (((_a = passData.userRef) === null || _a === void 0 ? void 0 : _a.id) !== userId) {
                throw new functions.https.HttpsError('permission-denied', 'Pass does not belong to the user');
            }

            // Check if pass is active
            if (passData.active !== true) {
                throw new functions.https.HttpsError('failed-precondition', 'Pass is not active');
            }

            // Check if pass is expired
            if (isPassExpired(passData.lastDay)) {
                throw new functions.https.HttpsError('failed-precondition', 'Cannot consume expired pass');
            }

            // Check if sufficient count is available
            if (passData.count < count) {
                throw new functions.https.HttpsError('failed-precondition', `Insufficient pass count. Available: ${passData.count}, Requested: ${count}`);
            }

            // Calculate new count
            const newCount = passData.count - count;

            // Update the pass count
            transaction.update(passRef, {
                count: newCount,
                updatedAt: FieldValue.serverTimestamp()
            });

            // Create pass log entry
            const passLogRef = db.collection('passLog').doc();
            const passLogData = {
                createdAt: FieldValue.serverTimestamp(),
                gymDisplayName: passData.gymDisplayName || 'Unknown Gym',
                passName: passData === null || passData === void 0 ? void 0 : passData.passName,
                count: count,
                price: passType === 'market' ? (passData.price || 0) : 0,
                fromUserRef: targetUserRef,
                toUserRef: adminData.id,
                action: 'consume',
                passType: passType,
                participants: [userId, adminData.id]
            };
            transaction.set(passLogRef, passLogData);

            return {
                success: true,
                message: `Successfully consumed ${count} pass(es) from ${(passData === null || passData === void 0 ? void 0 : passData.gymDisplayName) || (passData === null || passData === void 0 ? void 0 : passData.gymId)}`,
                consumedCount: count,
                remainingCount: newCount,
                passType: passType
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
