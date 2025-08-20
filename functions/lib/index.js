"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = exports.updateUserProfile = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
// Update user profile
exports.updateUserProfile = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { name, phoneNumber } = data;
    const uid = context.auth.uid;
    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Name is required and must be a non-empty string');
    }
    if (phoneNumber && typeof phoneNumber !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Phone number must be a string');
    }
    try {
        // Update user profile in Firestore - using 'users' collection to match security rules
        await db.collection('users').doc(uid).update({
            name: name.trim(),
            phoneNumber: (phoneNumber === null || phoneNumber === void 0 ? void 0 : phoneNumber.trim()) || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
// Get user profile
exports.getUserProfile = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const uid = context.auth.uid;
    try {
        // Use 'users' collection to match security rules
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User profile not found');
        }
        const userData = userDoc.data();
        return {
            uid: userData === null || userData === void 0 ? void 0 : userData.uid,
            email: userData === null || userData === void 0 ? void 0 : userData.email,
            name: userData === null || userData === void 0 ? void 0 : userData.name,
            phoneNumber: userData === null || userData === void 0 ? void 0 : userData.phoneNumber,
            createdAt: userData === null || userData === void 0 ? void 0 : userData.createdAt,
            updatedAt: userData === null || userData === void 0 ? void 0 : userData.updatedAt,
        };
    }
    catch (error) {
        console.error('Error getting user profile:', error);
        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes('permission-denied')) {
                throw new functions.https.HttpsError('permission-denied', 'You do not have permission to read this profile');
            }
            else if (error.message.includes('unavailable')) {
                throw new functions.https.HttpsError('unavailable', 'Firestore is temporarily unavailable');
            }
        }
        throw new functions.https.HttpsError('internal', 'Failed to get profile. Please try again.');
    }
});
//# sourceMappingURL=index.js.map