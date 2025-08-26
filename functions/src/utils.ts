// Helper function to check if a pass is expired
// Pass is valid until the end of the lastDay (23:59:59 HKT)
export const isPassExpired = (lastDay: any): boolean => {
    if (!lastDay || typeof lastDay.toDate !== 'function') {
        return false; // No expiration date means pass never expires
    }

    const lastDayDate = lastDay.toDate();
    const now = new Date();

    // Compare dates (not exact timestamps) since pass is valid until end of day
    // Set both dates to start of day for comparison
    const lastDayStartOfDay = new Date(lastDayDate.getFullYear(), lastDayDate.getMonth(), lastDayDate.getDate());
    const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return nowStartOfDay > lastDayStartOfDay;
};

// Helper function to sanitize Firestore data by removing circular references
export const sanitizeFirestoreData = (data: any): any => {
    if (data === null || typeof data !== 'object')
        return data;
    if (Array.isArray(data))
        return data.map(sanitizeFirestoreData);
    const sanitized = Object.assign({}, data);
    // Remove problematic Firestore fields that contain circular references
    delete sanitized.userRef;
    delete sanitized.privatePassRef;
    delete sanitized.fromUserRef;
    delete sanitized.toUserRef;
    // Convert Firestore Timestamps to ISO strings for better readability
    if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        sanitized.createdAt = data.createdAt.toDate().toISOString();
    }
    if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
        sanitized.updatedAt = data.updatedAt.toDate().toISOString();
    }
    if (data.lastDay && typeof data.lastDay.toDate === 'function') {
        sanitized.lastDay = data.lastDay.toDate().toISOString();
    }
    // Recursively sanitize nested objects
    for (const key in sanitized) {
        if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeFirestoreData(sanitized[key]);
        }
    }
    return sanitized;
};
