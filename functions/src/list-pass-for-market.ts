import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { isPassExpired } from './utils';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// List private pass for market function
export const listPassForMarket = onCall(async (request) => {
    // Check if user is authenticated
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { privatePassId, count, price, remarks } = request.data;
    // Validate input
    if (!privatePassId || !count || typeof count !== 'number' || count <= 0) {
        throw new HttpsError('invalid-argument', 'Invalid market listing parameters');
    }
    if (typeof price !== 'number' || price <= 0) {
        throw new HttpsError('invalid-argument', 'Price must be a positive number');
    }
    const userId = request.auth.uid;
    try {
        return await db.runTransaction(async (transaction) => {
            var _a;
            // Get user document to check telegramId
            const userRef = db.collection('users').doc(userId);
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new HttpsError('not-found', 'User not found');
            }
            const userData = userDoc.data();
            if (!(userData === null || userData === void 0 ? void 0 : userData.telegramId)) {
                throw new HttpsError('failed-precondition', 'You must set your Telegram ID before listing passes for sale');
            }
            // Get private pass document
            const privatePassRef = db.collection('privatePass').doc(privatePassId);
            const privatePassDoc = await transaction.get(privatePassRef);
            if (!privatePassDoc.exists) {
                throw new HttpsError('not-found', 'Private pass not found');
            }
            const privatePassData = privatePassDoc.data();
            if (!privatePassData) {
                throw new HttpsError('not-found', 'Private pass data is empty or invalid');
            }
            // Verify ownership and active status
            if (((_a = privatePassData.userRef) === null || _a === void 0 ? void 0 : _a.id) !== userId) {
                throw new HttpsError('permission-denied', 'You do not own this pass');
            }
            if (privatePassData.active !== true) {
                throw new HttpsError('failed-precondition', 'Pass is not active');
            }
            // Check if pass is expired
            if (isPassExpired(privatePassData.lastDay)) {
                throw new HttpsError('failed-precondition', 'Cannot list expired pass for sale');
            }
            // Check if count is sufficient
            if (privatePassData.count < count) {
                throw new HttpsError('failed-precondition', `Insufficient pass count. Available: ${privatePassData.count}, Requested: ${count}`);
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
            return {
                success: true,
                message: 'Pass listed for sale successfully',
                marketPassId: marketPassRef.id
            };
        });
    }
    catch (error) {
        console.error('Error in listPassForMarket:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Failed to list pass for sale. Please try again.');
    }
});
