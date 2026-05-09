import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const router = express.Router();

const getSupabase = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const getResend = () => new Resend(process.env.RESEND_API_KEY);

router.post('/', async (req, res) => {
  const supabase = getSupabase();
  const resend = getResend();
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

  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: email,
    subject: "You've been invited to the Learner Tracking System",
    html: `
      <p>You've been invited to supervise a program on the Learner Tracking System.</p>
      <p>Click the link below to accept your invitation:</p>
      <a href="${inviteLink}">${inviteLink}</a>
      <p>This link will expire in 7 days.</p>
    `,
  });

  if (emailError) return res.status(500).json({ error: emailError.message });

  return res.json({ success: true });
});

router.get('/validate', async (req, res) => {
  const supabase = getSupabase();
  const { token } = req.query;

  if (!token) return res.status(400).json({ error: 'No token provided', status: 'invalid' });

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Invite not found', status: 'invalid' });

  if (data.status === 'accepted') return res.status(400).json({ error: 'Invite already used', status: 'used' });

  if (new Date(data.expires_at) < new Date()) {
    await supabase.from('invitations').update({ status: 'expired' }).eq('token', token);
    return res.status(400).json({ error: 'Invite expired', status: 'expired' });
  }

  return res.json({ success: true, programId: data.program_id });
});

router.post('/accept', async (req, res) => {
  const supabase = getSupabase();
  const { token, uid } = req.body;

  if (!token || !uid) return res.status(400).json({ error: 'Missing token or uid' });

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Invite not found' });
  if (data.status === 'accepted') return res.status(400).json({ error: 'Invite already used' });
  if (new Date(data.expires_at) < new Date()) return res.status(400).json({ error: 'Invite expired' });

  const { error: assignError } = await supabase
    .from('user_assignments')
    .insert({ user_id: uid, program_id: data.program_id });

  if (assignError) return res.status(500).json({ error: assignError.message });

  await supabase.from('invitations').update({ status: 'accepted' }).eq('token', token);

  const admin = (await import('../config/firebase.js')).default
  await admin.auth().setCustomUserClaims(uid, { role: 'supervisor' });

  return res.json({ success: true });
});

export default router;