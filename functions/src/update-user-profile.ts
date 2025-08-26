import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Update user profile
export const updateUserProfile = functions.https.onCall(async (request) => {
    // Check if user is authenticated
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { name, phoneNumber, telegramId, gymMemberId } = request.data;
    const uid = request.auth.uid;
    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Name is required and must be a non-empty string');
    }
    if (phoneNumber && typeof phoneNumber !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Phone number must be a string');
    }
    if (telegramId && typeof telegramId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Telegram ID must be a string');
    }
    if (gymMemberId && typeof gymMemberId !== 'object') {
        throw new functions.https.HttpsError('invalid-argument', 'Gym member ID must be an object');
    }
    try {
        // Update user profile in Firestore - using 'users' collection to match security rules
        await db.collection('users').doc(uid).update({
            name: name.trim(),
            phoneNumber: (phoneNumber === null || phoneNumber === void 0 ? void 0 : phoneNumber.trim()) || null,
            telegramId: (telegramId === null || telegramId === void 0 ? void 0 : telegramId.trim()) || null,
            updatedAt: FieldValue.serverTimestamp(),
            gymMemberId: gymMemberId || null,
        });
        return { success: true };
    }
    catch (error) {
        console.error('Error updating user profile:', error);
        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes('permission-denied')) {
                throw new functions.https.HttpsError('permission-denied', 'You do not have permission to update this profile');
            }
            else if (error.message.includes('not-found')) {
                throw new functions.https.HttpsError('not-found', 'User profile not found');
            }
            else if (error.message.includes('unavailable')) {
                throw new functions.https.HttpsError('unavailable', 'Firestore is temporarily unavailable');
            }
        }
        throw new functions.https.HttpsError('internal', 'Failed to update profile. Please try again.');
    }
});
