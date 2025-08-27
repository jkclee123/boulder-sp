import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { isPassExpired } from './utils';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Sell market pass function
export const sellMarketPass = onCall(async (request) => {
    // Check if user is authenticated
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { fromUserId, toUserId, passId, count, price } = request.data;
    // Validate input
    if (!fromUserId || !toUserId || !passId || !count || typeof count !== 'number' || count <= 0) {
        throw new HttpsError('invalid-argument', 'Invalid sell parameters');
    }
    if (fromUserId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'You can only sell your own passes');
    }
    if (fromUserId === toUserId) {
        throw new HttpsError('invalid-argument', 'Cannot sell to yourself');
    }
    const sellPrice = price || 0;
    try {
        return await db.runTransaction(async (transaction) => {
            var _a;
            // Get source market pass document
            const sourcePassRef = db.collection('marketPass').doc(passId);
            const sourcePassDoc = await transaction.get(sourcePassRef);
            if (!sourcePassDoc.exists) {
                throw new HttpsError('not-found', 'Source pass not found');
            }
            const sourcePassData = sourcePassDoc.data();
            if (!sourcePassData) {
                throw new HttpsError('not-found', 'Source pass data is empty or invalid');
            }
            // Verify ownership and active status
            if (((_a = sourcePassData.userRef) === null || _a === void 0 ? void 0 : _a.id) !== fromUserId) {
                throw new HttpsError('permission-denied', 'You do not own this pass');
            }
            if (sourcePassData.active !== true) {
                throw new HttpsError('failed-precondition', 'Pass is not active');
            }
            // Check if pass is expired
            if (isPassExpired(sourcePassData.lastDay)) {
                throw new HttpsError('failed-precondition', 'Cannot sell expired pass');
            }
            // Check if count is sufficient
            if (sourcePassData.count < count) {
                throw new HttpsError('failed-precondition', `Insufficient pass count. Available: ${sourcePassData.count}, Requested: ${count}`);
            }
            // Get recipient user
            const toUserRef = db.collection('users').doc(toUserId);
            const toUserDoc = await transaction.get(toUserRef);
            if (!toUserDoc.exists) {
                throw new HttpsError('not-found', 'Recipient user not found');
            }
            // Create new private pass for buyer
            const newPassRef = db.collection('privatePass').doc();
            const newPassData = {
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                gymDisplayName: sourcePassData.gymDisplayName,
                gymId: sourcePassData.gymId,
                passName: sourcePassData.passName,
                purchasePrice: sellPrice * count,
                purchaseCount: count,
                count: count,
                userRef: toUserRef,
                lastDay: sourcePassData.lastDay,
                active: true
            };
            transaction.set(newPassRef, newPassData);
            // Reduce count from source pass
            transaction.update(sourcePassRef, {
                count: FieldValue.increment(-count),
                updatedAt: FieldValue.serverTimestamp()
            });
            // Create pass record entry
            const passRecordRef = db.collection('passRecord').doc();
            const passRecordData = {
                createdAt: FieldValue.serverTimestamp(),
                gymDisplayName: sourcePassData.gymDisplayName,
                passName: sourcePassData.passName,
                count: count,
                price: sellPrice,
                fromUserRef: db.collection('users').doc(fromUserId),
                toUserRef: toUserRef,
                action: 'sell_market',
                participants: [fromUserId, toUserId]
            };
            transaction.set(passRecordRef, passRecordData);
            return {
                success: true,
                message: 'Sale completed successfully',
                newPassId: newPassRef.id
            };
        });
    }
    catch (error) {
        console.error('Error in sellMarketPass:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Sale failed. Please try again.');
    }
});
