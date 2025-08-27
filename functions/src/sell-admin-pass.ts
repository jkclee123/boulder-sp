import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Sell admin pass function
export const sellAdminPass = onCall(async (request) => {
    // Check if user is authenticated
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { adminPassId, recipientUserId } = request.data;
    // Validate input
    if (!adminPassId || !recipientUserId) {
        throw new HttpsError('invalid-argument', 'Invalid sell parameters');
    }
    // Only admins can sell admin passes
    const adminId = request.auth.uid;
    const adminDoc = await db.collection('users').doc(adminId).get();
    const adminData = adminDoc.data();
    if (!(adminData === null || adminData === void 0 ? void 0 : adminData.isAdmin)) {
        throw new HttpsError('permission-denied', 'Only admins can sell admin passes');
    }
    try {
        return await db.runTransaction(async (transaction) => {
            // Get admin pass document
            const adminPassRef = db.collection('adminPass').doc(adminPassId);
            const adminPassDoc = await transaction.get(adminPassRef);
            if (!adminPassDoc.exists) {
                throw new HttpsError('not-found', 'Admin pass not found');
            }
            const adminPassData = adminPassDoc.data();
            if (!adminPassData) {
                throw new HttpsError('not-found', 'Admin pass data is empty or invalid');
            }
            // Verify admin has permission for this gym
            if (!adminData?.adminGym || adminData.adminGym !== adminPassData.gymId) {
                throw new HttpsError('permission-denied', 'You can only sell admin passes from your assigned gym');
            }
            // Verify pass is active
            if (adminPassData.active !== true) {
                throw new HttpsError('failed-precondition', 'Admin pass is not active');
            }
            // Get recipient user
            const recipientUserRef = db.collection('users').doc(recipientUserId);
            const recipientUserDoc = await transaction.get(recipientUserRef);
            if (!recipientUserDoc.exists) {
                throw new HttpsError('not-found', 'Recipient user not found');
            }
            // Calculate new lastDay for transferred pass based on admin pass creation time
            let newPassLastDay = null;
            if (adminPassData.duration && adminPassData.duration > 0) {
                // Use admin pass creation time as the base, or current time if not available
                const baseTime = adminPassData.createdAt
                    ? (adminPassData.createdAt.toDate ? adminPassData.createdAt.toDate() : new Date(adminPassData.createdAt))
                    : new Date();

                // Work in UTC to avoid timezone complications
                const baseYear = baseTime.getUTCFullYear();
                const baseMonth = baseTime.getUTCMonth();
                const baseDay = baseTime.getUTCDate();

                // Calculate target month and year
                const totalMonths = baseMonth + adminPassData.duration;
                const targetYear = baseYear + Math.floor(totalMonths / 12);
                const targetMonth = totalMonths % 12;

                // Get the number of days in the target month to prevent rollover
                const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

                // Use the minimum of the original day or the target month's max day
                const targetDay = Math.min(baseDay, daysInTargetMonth);

                // Create the target date in UTC (15:59:59.999 UTC = 23:59:59.999 HKT)
                const targetDate = new Date(Date.UTC(targetYear, targetMonth, targetDay, 15, 59, 59, 999));

                newPassLastDay = Timestamp.fromDate(targetDate);
            }
            // Create new private pass for recipient
            const newPassRef = db.collection('privatePass').doc();
            const newPassData = {
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                gymDisplayName: adminPassData.gymDisplayName,
                gymId: adminPassData.gymId,
                passName: adminPassData.passName,
                purchasePrice: adminPassData.price || 0,
                purchaseCount: adminPassData.count || 0,
                count: adminPassData.count || 0,
                userRef: recipientUserRef,
                lastDay: newPassLastDay,
                active: true
            };
            transaction.set(newPassRef, newPassData);
            // Create pass record entry
            const passRecordRef = db.collection('passRecord').doc();
            const passRecordData = {
                createdAt: FieldValue.serverTimestamp(),
                gymDisplayName: adminPassData.gymDisplayName,
                gymId: adminPassData.gymId,
                passName: adminPassData.passName,
                count: adminPassData.count || 0,
                price: adminPassData.price || 0,
                fromUserRef: db.collection('users').doc(adminId),
                toUserRef: recipientUserRef,
                action: 'sell_admin',
                participants: [adminId, recipientUserId]
            };
            transaction.set(passRecordRef, passRecordData);
            return {
                success: true,
                message: 'Admin pass sold successfully',
                newPassId: newPassRef.id
            };
        });
    }
    catch (error) {
        console.error('Error in sellAdminPass:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Failed to sell admin pass. Please try again.');
    }
});
