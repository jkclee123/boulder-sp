import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Remove pass function (soft delete by setting active to false)
export const removePass = onCall(async (request) => {
    console.log('removePass called with request data:', {
        hasAuth: !!request.auth,
        authUid: request.auth?.uid,
        data: request.data
    });
    // Check if user is authenticated
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { passId, passType } = request.data;
    // Validate input
    if (!passId || !passType) {
        throw new HttpsError('invalid-argument', 'Pass ID and pass type are required');
    }
    if (passType !== 'private' && passType !== 'market') {
        throw new HttpsError('invalid-argument', 'Pass type must be either "private" or "market"');
    }
    const userId = request.auth.uid;
    try {
        return await db.runTransaction(async (transaction) => {
            var _a;
            // Get pass document based on type
            const collectionName = passType === 'private' ? 'privatePass' : 'marketPass';
            const passRef = db.collection(collectionName).doc(passId);
            const passDoc = await transaction.get(passRef);
            if (!passDoc.exists) {
                throw new HttpsError('not-found', `${passType} pass not found`);
            }
            const passData = passDoc.data();
            if (!passData) {
                throw new HttpsError('not-found', `${passType} pass data is empty or invalid`);
            }
            // Verify ownership
            if (((_a = passData.userRef) === null || _a === void 0 ? void 0 : _a.id) !== userId) {
                throw new HttpsError('permission-denied', `You do not own this ${passType} pass`);
            }
            // Check if pass is already inactive
            if (passData.active !== true) {
                throw new HttpsError('failed-precondition', `${passType} pass is already inactive`);
            }
            // Soft delete by setting active to false
            transaction.update(passRef, {
                active: false,
                updatedAt: FieldValue.serverTimestamp()
            });
            return {
                success: true,
                message: `${passType} pass removed successfully`,
                passId: passId,
                passType: passType
            };
        });
    }
    catch (error) {
        console.error('Error in removePass:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Failed to remove pass. Please try again.');
    }
});
