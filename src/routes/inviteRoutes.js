import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const getSupabase = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

router.post('/', async (req, res) => {
  const supabase = getSupabase();
  const { email, programId } = req.body;

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      email,
      program_id: programId,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const inviteLink = `${process.env.FRONTEND_URL_DEV}/invite?token=${data.token}`;
  console.log('Invite link:', inviteLink);

  return res.json({ success: true, inviteLink });
});

export default router;