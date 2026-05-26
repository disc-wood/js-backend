import admin from '../config/firebase.js';
import postgresProvider from '../providers/postgresProvider.js';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null;

    if (!token) {
      return res.status(401).json({ error: 'No Firebase ID token provided' });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const dbUser = await postgresProvider.findByUid(decoded.uid);

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: dbUser?.role || null,
    };

    next();
  } catch (error) {
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Firebase ID token expired' });
    }
    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ error: 'Invalid Firebase ID token' });
    }
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export default authMiddleware;