import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Delete admin pass function
export const deleteAdminPass = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { adminPassId } = data;
    // Validate input
    if (!adminPassId) {
        throw new functions.https.HttpsError('invalid-argument', 'Admin pass ID is required');
    }
    // Only admins can delete admin passes
    const adminId = context.auth.uid;
    const adminDoc = await db.collection('users').doc(adminId).get();
    const adminData = adminDoc.data();
    if (!(adminData === null || adminData === void 0 ? void 0 : adminData.isAdmin)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can delete admin passes');
    }
    try {
        return await db.runTransaction(async (transaction) => {
            // Get admin pass document
            const adminPassRef = db.collection('adminPass').doc(adminPassId);
            const adminPassDoc = await transaction.get(adminPassRef);
            if (!adminPassDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Admin pass not found');
            }
            const adminPassData = adminPassDoc.data();
            // Verify admin has permission for this gym
            if (!adminData?.adminGym || adminData.adminGym !== (adminPassData === null || adminPassData === void 0 ? void 0 : adminPassData.gymId)) {
                throw new functions.https.HttpsError('permission-denied', 'You can only delete admin passes from your assigned gym');
            }
            // Delete the admin pass permanently
            transaction.delete(adminPassRef);
            return {
                success: true,
                message: 'Admin pass deleted successfully'
            };
        });
    }
    catch (error) {
        console.error('Error in deleteAdminPass:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to delete admin pass. Please try again.');
    }
});
