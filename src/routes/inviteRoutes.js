import express from 'express';
import { createClient } from '@supabase/supabase-js';
import transporter from '../config/mailer.js';

const router = express.Router();

const getSupabase = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Generate invite and send email automatically
router.post('/generate', async (req, res) => {
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

  const baseUrl = process.env.FRONTEND_URL || process.env.FRONTEND_URL_DEV;
  const inviteLink = `${baseUrl}/invite?token=${data.token}`;

  try {
    await transporter.sendMail({
      from: `"Learner Tracking System" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "You've been invited to the Learner Tracking System",
      html: `
        <p>Hi,</p>
        <p>You've been invited to supervise a program on the Learner Tracking System.</p>
        <p>Click the link below to accept your invitation:</p>
        <a href="${inviteLink}">${inviteLink}</a>
        <p>This link will expire in 7 days.</p>
      `,
    });
  } catch (emailError) {
    console.error('Email failed:', emailError);
    return res.status(500).json({ error: 'Invite created but email failed to send.' });
  }

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

  const admin = (await import('../config/firebase.js')).default;
  await admin.auth().setCustomUserClaims(uid, { role: 'supervisor' });

  return res.json({ success: true });
});

router.get('/list', async (req, res) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ invitations: data });
});

router.get('/active', async (req, res) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('user_assignments')
    .select('*');

  if (error) return res.status(500).json({ error: error.message });

  const admin = (await import('../config/firebase.js')).default;
  const enriched = await Promise.all(
    data.map(async (row) => {
      try {
        const user = await admin.auth().getUser(row.user_id);
        return { ...row, email: user.email };
      } catch {
        return { ...row, email: 'unknown' };
      }
    })
  );

  return res.json({ supervisors: enriched });
});

router.delete('/revoke', async (req, res) => {
  const supabase = getSupabase();
  const { userId, programId } = req.body;

  if (!userId || !programId) {
    return res.status(400).json({ error: 'Missing userId or programId' });
  }

  const { error: deleteError } = await supabase
    .from('user_assignments')
    .delete()
    .eq('user_id', userId)
    .eq('program_id', programId);

  if (deleteError) return res.status(500).json({ error: deleteError.message });

  const { data: remaining } = await supabase
    .from('user_assignments')
    .select('program_id')
    .eq('user_id', userId);

  if (!remaining || remaining.length === 0) {
    const admin = (await import('../config/firebase.js')).default;
    await admin.auth().setCustomUserClaims(userId, {});
  }

  return res.json({ success: true });
});

router.delete('/cancel/:token', async (req, res) => {
  const supabase = getSupabase();
  const { token } = req.params;

  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('token', token);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
});

export default router;