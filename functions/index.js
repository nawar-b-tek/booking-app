const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;
  const email = user.email || null;
  const displayName = user.displayName || null;

  const firestore = admin.firestore();
  const userRef = firestore.doc(`users/${uid}`);

  // merge any client-sent data, but enforce role = 'user'
  await userRef.set({
    email,
    displayName,
    role: 'user',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  // set a custom claim with the role
  await admin.auth().setCustomUserClaims(uid, { role: 'user' });

  return null;
});
