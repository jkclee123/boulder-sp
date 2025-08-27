import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { isPassExpired } from './utils';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Unlist market pass function
export const unlistPass = onCall(async (request) => {
    // Check if user is authenticated
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { marketPassId } = request.data;
    // Validate input
    if (!marketPassId) {
        throw new HttpsError('invalid-argument', 'Market pass ID is required');
    }
    const userId = request.auth.uid;
    try {
        return await db.runTransaction(async (transaction) => {
            var _a, _b;
            // Get market pass document
            const marketPassRef = db.collection('marketPass').doc(marketPassId);
            const marketPassDoc = await transaction.get(marketPassRef);
            if (!marketPassDoc.exists) {
                throw new HttpsError('not-found', 'Market pass not found');
            }
            const marketPassData = marketPassDoc.data();
            if (!marketPassData) {
                throw new HttpsError('not-found', 'Market pass data is empty or invalid');
            }
            // Verify ownership and active status
            if (((_a = marketPassData.userRef) === null || _a === void 0 ? void 0 : _a.id) !== userId) {
                throw new HttpsError('permission-denied', 'You do not own this market pass');
            }
            if (marketPassData.active !== true) {
                throw new HttpsError('failed-precondition', 'Market pass is not active');
            }
            // Check if pass is expired
            if (isPassExpired(marketPassData.lastDay)) {
                throw new HttpsError('failed-precondition', 'Cannot unlist expired pass');
            }
            // Get the parent private pass
            if (!marketPassData.privatePassRef) {
                throw new HttpsError('failed-precondition', 'Market pass does not have a parent private pass reference');
            }
            const privatePassRef = marketPassData.privatePassRef as admin.firestore.DocumentReference;
            const privatePassDoc = await transaction.get(privatePassRef);
            if (!privatePassDoc.exists) {
                throw new HttpsError('not-found', 'Parent private pass not found');
            }
            const privatePassData = privatePassDoc.data();
            if (!privatePassData) {
                throw new HttpsError('not-found', 'Parent private pass data is empty or invalid');
            }
            // Verify parent pass ownership and active status
            if (((_b = privatePassData.userRef) === null || _b === void 0 ? void 0 : _b.id) !== userId) {
                throw new HttpsError('permission-denied', 'You do not own the parent private pass');
            }
            if (privatePassData.active !== true) {
                throw new HttpsError('failed-precondition', 'Parent private pass is not active');
            }
            // Get the count to add back to parent pass
            const countToAddBack = marketPassData.count || 0;
            // Add count back to parent private pass
            transaction.update(privatePassRef, {
                count: FieldValue.increment(countToAddBack),
                updatedAt: FieldValue.serverTimestamp()
            });
            // Delete the market pass
            transaction.delete(marketPassRef);
            return {
                success: true,
                message: 'Pass unlisted successfully',
                countAddedBack: countToAddBack
            };
        });
    }
    catch (error) {
        console.error('Error in unlistPass:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Failed to unlist pass. Please try again.');
    }
});
