import admin from '../config/firebase.js';

const authController = {
  async signup(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
        });
      }

      const userRecord = await admin.auth().createUser({ email, password });

      return res.status(201).json({
        message: 'User created successfully',
        uid: userRecord.uid,
      });

    } catch (error) {
      console.error('Signup error:', error);

      if (error.code === 'auth/email-already-exists') {
        return res.status(400).json({ error: 'Email already in use' });
      }

      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async login(req, res) {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ error: 'Firebase ID token is required' });
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken);

      res.cookie('session', idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600 * 1000,
        path: '/',
      });

      return res.status(200).json({ message: 'Login successful', uid: decodedToken.uid });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  },

  async getMe(req, res) {
    try {
      const token =
        req.cookies.session || req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);

      return res.json({
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role || null,
      });

    } catch (error) {
      console.error('ME endpoint error:', error);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  },

  async logout(_req, res) {
    try {
      res.clearCookie('session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      return res.json({ message: 'Logged out successfully' });

    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ error: 'Logout failed' });
    }
  },

  async handleToken(req, res) {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ error: 'No ID token provided' });
      }

      await admin.auth().verifyIdToken(idToken);

      res.cookie('session', idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600 * 1000,
        path: '/',
      });

      return res.json({ success: true });

    } catch (error) {
      console.error('Token handling error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

export default authController;
