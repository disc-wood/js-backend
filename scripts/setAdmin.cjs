require('dotenv').config();
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdmin(uid) {
  await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
  console.log('Admin claim set for', uid);
}

setAdmin('II1nynT1dUMHzDkoaYJFJWRuLes1'); // hannah.webb.tech@gmail.com is current Admin