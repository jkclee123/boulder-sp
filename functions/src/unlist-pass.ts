import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Unlist market pass function
export const unlistPass = functions.https.onCall(async (data, context) => {
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
            if (!marketPassData) {
                throw new functions.https.HttpsError('not-found', 'Market pass data is empty or invalid');
            }
            // Verify ownership and active status
            if (((_a = marketPassData.userRef) === null || _a === void 0 ? void 0 : _a.id) !== userId) {
                throw new functions.https.HttpsError('permission-denied', 'You do not own this market pass');
            }
            if (marketPassData.active !== true) {
                throw new functions.https.HttpsError('failed-precondition', 'Market pass is not active');
            }
            // Check if pass is expired
            if (marketPassData.lastDay && marketPassData.lastDay.toDate() < new Date()) {
                throw new functions.https.HttpsError('failed-precondition', 'Cannot unlist expired pass');
            }
            // Get the parent private pass
            if (!marketPassData.privatePassRef) {
                throw new functions.https.HttpsError('failed-precondition', 'Market pass does not have a parent private pass reference');
            }
            const privatePassRef = marketPassData.privatePassRef as admin.firestore.DocumentReference;
            const privatePassDoc = await transaction.get(privatePassRef);
            if (!privatePassDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Parent private pass not found');
            }
            const privatePassData = privatePassDoc.data();
            if (!privatePassData) {
                throw new functions.https.HttpsError('not-found', 'Parent private pass data is empty or invalid');
            }
            // Verify parent pass ownership and active status
            if (((_b = privatePassData.userRef) === null || _b === void 0 ? void 0 : _b.id) !== userId) {
                throw new functions.https.HttpsError('permission-denied', 'You do not own the parent private pass');
            }
            if (privatePassData.active !== true) {
                throw new functions.https.HttpsError('failed-precondition', 'Parent private pass is not active');
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
            // Create pass log entry (optional - unlist action)
            const passLogRef = db.collection('passLog').doc();
            const passLogData = {
                createdAt: FieldValue.serverTimestamp(),
                gym: marketPassData.gymDisplayName,
                passName: marketPassData.passName,
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
