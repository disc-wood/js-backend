import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const getSupabase = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

router.get('/me/assignments', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  let uid;
  try {
    const admin = (await import('../config/firebase.js')).default;
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_assignments')
    .select('program_id')
    .eq('user_id', uid);

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ programIds: data.map(row => row.program_id) });
});

export default router;