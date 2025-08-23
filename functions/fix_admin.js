const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'boulder-sp-dev'
});

const db = admin.firestore();

async function fixAdminGym() {
  try {
    const adminId = 'mLEyXXbeKwJiuc3SnTnsQMKwOCjo';

    console.log('Updating admin user profile...');

    const adminRef = db.collection('users').doc(adminId);
    await adminRef.update({
      adminGym: 'crux',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Successfully updated adminGym to "crux"');

    // Verify the update
    const updatedDoc = await adminRef.get();
    const updatedData = updatedDoc.data();
    console.log('Updated admin profile:', {
      uid: updatedData?.uid,
      isAdmin: updatedData?.isAdmin,
      adminGym: updatedData?.adminGym
    });

  } catch (error) {
    console.error('❌ Error updating admin profile:', error);
  } finally {
    process.exit(0);
  }
}

fixAdminGym();
