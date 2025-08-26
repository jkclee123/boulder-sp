import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Get user profile
export const getUserProfile = onCall(async (request) => {
    // Check if user is authenticated
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    const uid = request.auth.uid;
    try {
        // Use 'users' collection to match security rules
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'User profile not found');
        }
        const userData = userDoc.data();
        return {
            uid: userData === null || userData === void 0 ? void 0 : userData.uid,
            email: userData === null || userData === void 0 ? void 0 : userData.email,
            name: userData === null || userData === void 0 ? void 0 : userData.name,
            phoneNumber: userData === null || userData === void 0 ? void 0 : userData.phoneNumber,
            telegramId: userData === null || userData === void 0 ? void 0 : userData.telegramId,
            createdAt: userData === null || userData === void 0 ? void 0 : userData.createdAt,
            updatedAt: userData === null || userData === void 0 ? void 0 : userData.updatedAt,
            gymMemberId: (userData === null || userData === void 0 ? void 0 : userData.gymMemberId) || {},
            isAdmin: (userData === null || userData === void 0 ? void 0 : userData.isAdmin) || false,
            adminGym: userData === null || userData === void 0 ? void 0 : userData.adminGym,
        };
    }
    catch (error) {
        console.error('Error getting user profile:', error);
        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes('permission-denied')) {
                throw new HttpsError('permission-denied', 'You do not have permission to read this profile');
            }
            else if (error.message.includes('unavailable')) {
                throw new HttpsError('unavailable', 'Firestore is temporarily unavailable');
            }
        }
        throw new HttpsError('internal', 'Failed to get profile. Please try again.');
    }
});
