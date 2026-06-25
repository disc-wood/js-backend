import express from 'express';
import { createClient } from '@supabase/supabase-js';
import transporter from '../config/mailer.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireAdmin from '../middleware/requireAdmin.js';
import { getTemplate, renderTemplate } from '../utils/emailTemplates.js';

const router = express.Router();

const getSupabase = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Must stay in sync with the `programs` list in config/programs.js on the frontend.
const PROGRAM_LABELS = {
  oakton: 'Oakton College',
  ihtu: 'I Hope They Understand',
};

// Admin only — generate invite and send email
router.post('/generate', authMiddleware, requireAdmin, async (req, res) => {
  const supabase = getSupabase();
  const { email, programId } = req.body;

  const admin = (await import('../config/firebase.js')).default;
  try {
    const existingUser = await admin.auth().getUserByEmail(email);
    const { data: existingAssignment } = await supabase
      .from('user_assignments')
      .select('id')
      .eq('user_id', existingUser.uid)
      .eq('program_id', programId)
      .maybeSingle();

    if (existingAssignment) {
      return res.status(400).json({ error: 'This supervisor already has access' });
    }
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      console.error('Error checking existing access:', err);
    }
  }

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
  const programName = PROGRAM_LABELS[programId] || programId;

  try {
    const tmpl = await getTemplate(`invite-${programId}`);
    const html = tmpl
      ? renderTemplate(tmpl.body, { program_name: programName, invite_link: inviteLink })
      : `
        <p>Hi,</p>
        <p>You've been invited to supervise the ${programName} program on the Learner Tracking System.</p>
        <p>Click the link below to accept your invitation:</p>
        <a href="${inviteLink}">${inviteLink}</a>
        <p>This link will expire in 7 days.</p>
      `;
    await transporter.sendMail({
      from: `"Learner Tracking System" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: tmpl?.subject || "You've been invited to the Learner Tracking System",
      html,
    });
  } catch (emailError) {
    console.error('Email failed:', emailError);
    return res.status(500).json({ error: 'Invite created but email failed to send.' });
  }

  return res.json({ success: true });
});

// Public — invited user validates their token before logging in / signing up
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

// Public — called right after the invited user creates their account; this is what assigns their role
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

// Admin only — list all invitations
router.get('/list', authMiddleware, requireAdmin, async (_req, res) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ invitations: data });
});

// Admin only — list all active supervisors
router.get('/active', authMiddleware, requireAdmin, async (_req, res) => {
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

// Admin only — revoke a supervisor's access
router.delete('/revoke', authMiddleware, requireAdmin, async (req, res) => {
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

  const admin = (await import('../config/firebase.js')).default;

  if (!remaining || remaining.length === 0) {
    await admin.auth().setCustomUserClaims(userId, {});
  }

  try {
    const user = await admin.auth().getUser(userId);
    const programName = PROGRAM_LABELS[programId] || programId;
    const tmpl = await getTemplate(`revoke-${programId}`);
    const html = tmpl
      ? renderTemplate(tmpl.body, { program_name: programName })
      : `
        <p>Hi,</p>
        <p>Your access to the ${programName} program on the Learner Tracking System has been revoked.</p>
        <p>If you believe this was a mistake, please contact your admin.</p>
      `;
    await transporter.sendMail({
      from: `"Learner Tracking System" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: tmpl?.subject || `Your access to ${programName} has been revoked`,
      html,
    });
  } catch (emailError) {
    console.error('Revocation email failed:', emailError.message);
  }

  return res.json({ success: true });
});

// Admin only — cancel a pending invite
router.delete('/cancel/:token', authMiddleware, requireAdmin, async (req, res) => {
  const supabase = getSupabase();
  const { token } = req.params;

  const { data: invitation } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('token', token);

  if (error) return res.status(500).json({ error: error.message });

  if (invitation) {
    try {
      const programName = PROGRAM_LABELS[invitation.program_id] || invitation.program_id;
      const tmpl = await getTemplate(`cancel-${invitation.program_id}`);
      const html = tmpl
        ? renderTemplate(tmpl.body, { program_name: programName })
        : `
          <p>Hi,</p>
          <p>Your invitation to supervise the ${programName} program on the Learner Tracking System has been canceled.</p>
          <p>If you believe this was a mistake, please contact your admin.</p>
        `;
      await transporter.sendMail({
        from: `"Learner Tracking System" <${process.env.GMAIL_USER}>`,
        to: invitation.email,
        subject: tmpl?.subject || `Your invitation to ${programName} has been canceled`,
        html,
      });
    } catch (emailError) {
      console.error('Cancellation email failed:', emailError.message);
    }
  }

  return res.json({ success: true });
});

export default router;
