import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Add admin pass function
export const addAdminPass = functions.https.onCall(async (data, context) => {
    console.log('addAdminPass called with data:', JSON.stringify(data, null, 2));
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { gymId, gymDisplayName, passName, count, price, duration } = data;
    // Validate input
    if (!gymId || !gymDisplayName || !passName || !count || typeof count !== 'number' || count <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid admin pass parameters');
    }
    if (typeof passName !== 'string' || passName.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Pass name is required and must be a non-empty string');
    }
    if (typeof price !== 'number' || price < 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Price must be a non-negative number');
    }
    if (typeof duration !== 'number' || duration <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Duration must be a positive number');
    }
    // Only admins can add admin passes
    const adminId = context.auth.uid;
    const adminDoc = await db.collection('users').doc(adminId).get();
    const adminData = adminDoc.data();
    if (!(adminData === null || adminData === void 0 ? void 0 : adminData.isAdmin)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can add admin passes');
    }
    // Verify admin has permission for this gym
    if (!adminData?.adminGym || adminData.adminGym !== gymId) {
        throw new functions.https.HttpsError('permission-denied', 'You can only add admin passes for your assigned gym');
    }
    try {
        // Create new admin pass
        const adminPassRef = db.collection('adminPass').doc();
        const adminPassData = {
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            gymDisplayName: gymDisplayName,
            gymId: gymId,
            passName: passName.trim(),
            count: count,
            price: price,
            duration: duration,
            active: true
        };
        console.log('Saving admin pass data:', JSON.stringify(Object.assign(Object.assign({}, adminPassData), { createdAt: '[serverTimestamp]', updatedAt: '[serverTimestamp]' }), null, 2));
        await adminPassRef.set(adminPassData);
        return {
            success: true,
            message: 'Admin pass added successfully',
            adminPassId: adminPassRef.id
        };
    }
    catch (error) {
        console.error('Error in addAdminPass:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to add admin pass. Please try again.');
    }
});
