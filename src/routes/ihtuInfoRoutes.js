import express from 'express';
import { createClient } from '@supabase/supabase-js';
import postgresProvider from '../providers/postgresProvider.js';
import transporter from '../config/mailer.js';
import authMiddleware from '../middleware/authMiddleware.js';

const getSupabase = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const router = express.Router();

// All required fields from the new IHTU form
const REQUIRED_FIELDS = [
  'firstName', 'lastName', 'email', 'phoneNumber', 'gender',
  'dateOfBirth', 'ethnicityRace', 'currentCity', 'zipCode',
  'knowsHealthyRacialIdentity',
  'discussedRacialIdentity',
  'discussedCulturalCompetence',
];

function isEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

// GET all IHTU intakes (for Database page)
router.get('/intakes', authMiddleware, async (_req, res) => {
  try {
    const data = await postgresProvider.getAllIhtuIntakes();
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch ihtu intakes:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// POST a new IHTU intake (from the public form)
router.post('/intakes', async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((key) => isEmpty(req.body?.[key]));

    if (missing.length) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing,
      });
    }

    // Check if custom question is active; if so, require an answer
    const supabase = getSupabase();
    const { data: customQ } = await supabase
      .from('custom_questions')
      .select('question_text, is_active')
      .eq('program_id', 'ihtu')
      .maybeSingle();

    if (customQ?.is_active && customQ?.question_text && isEmpty(req.body?.customAnswer)) {
      return res.status(400).json({ error: 'Missing required fields', missing: ['customAnswer'] });
    }

    // Snapshot the current question text server-side
    const customQuestionSnapshot =
      customQ?.is_active && customQ?.question_text ? customQ.question_text : null;

    const created = await postgresProvider.createIhtuIntake({
      ...req.body,
      customQuestion: customQuestionSnapshot,
    });

    try {
      await transporter.sendMail({
        from: `"I Hope They Understand" <${process.env.GMAIL_USER}>`,
        to: req.body.email,
        subject: 'Your IHTU Application Has Been Received',
        html: `
          <p>Hi ${req.body.firstName},</p>
          <p>Thank you for submitting your <strong>I Hope They Understand</strong> application. We've received your information and will be in touch soon.</p>
          <p>— The IHTU Team</p>
        `,
      });
    } catch (emailErr) {
      console.error('IHTU confirmation email failed:', emailErr);
      return res.status(201).json({ success: true, intake: created, emailError: emailErr.message });
    }

    res.status(201).json({ success: true, intake: created });
  } catch (error) {
    console.error('Failed to create ihtu intake:', error);
    res.status(500).json({ error: 'Failed to save intake' });
  }
});

export default router;