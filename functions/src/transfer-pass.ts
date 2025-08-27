import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { isPassExpired } from './utils';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Transfer pass function
export const transferPass = onCall(async (request) => {
    // Check if user is authenticated
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { fromUserId, toUserId, passId, passType, count, price } = request.data;
    // Validate input
    if (!fromUserId || !toUserId || !passId || !passType || !count || typeof count !== 'number' || count <= 0) {
        throw new HttpsError('invalid-argument', 'Invalid transfer parameters');
    }
    if (fromUserId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'You can only transfer your own passes');
    }
    if (fromUserId === toUserId) {
        throw new HttpsError('invalid-argument', 'Cannot transfer to yourself');
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
            else {
                throw new HttpsError('invalid-argument', 'Invalid pass type');
            }
            const sourcePassDoc = await transaction.get(sourcePassRef);
            if (!sourcePassDoc.exists) {
                throw new HttpsError('not-found', 'Source pass not found');
            }
            sourcePassData = sourcePassDoc.data();
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
                throw new HttpsError('failed-precondition', 'Cannot transfer expired pass');
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
            // Calculate lastDay for new pass
            let newPassLastDay = null;
            // For private and market passes, preserve the original lastDay
            if (sourcePassData.lastDay && typeof sourcePassData.lastDay.toDate === 'function') {
                newPassLastDay = sourcePassData.lastDay;
            }
            // Create new private pass for recipient
            const newPassRef = db.collection('privatePass').doc();
            const newPassData = {
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                gymDisplayName: sourcePassData.gymDisplayName,
                gymId: sourcePassData.gymId,
                passName: sourcePassData.passName,
                purchasePrice: transferPrice,
                purchaseCount: count,
                count: count,
                userRef: toUserRef,
                lastDay: newPassLastDay,
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
                price: transferPrice,
                fromUserRef: db.collection('users').doc(fromUserId),
                toUserRef: toUserRef,
                action: 'transfer',
                participants: [fromUserId, toUserId]
            };
            transaction.set(passRecordRef, passRecordData);
            return {
                success: true,
                message: 'Transfer completed successfully',
                newPassId: newPassRef.id
            };
        });
    }
    catch (error) {
        console.error('Error in transfer:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Transfer failed. Please try again.');
    }
});
