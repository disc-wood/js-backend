import express from 'express';
import postgresProvider from '../providers/postgresProvider.js';
import transporter from '../config/mailer.js';
import authMiddleware from '../middleware/authMiddleware.js';

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

    const created = await postgresProvider.createIhtuIntake(req.body);

    // Send confirmation email (non-blocking)
    transporter
      .sendMail({
        from: `"I Hope They Understand" <${process.env.GMAIL_USER}>`,
        to: req.body.email,
        subject: 'Your IHTU Application Has Been Received',
        html: `
          <p>Hi ${req.body.firstName},</p>
          <p>Thank you for submitting your <strong>I Hope They Understand</strong> application. We've received your information and will be in touch soon.</p>
          <p>— The IHTU Team</p>
        `,
      })
      .catch((err) => console.error('IHTU confirmation email failed:', err));

    res.status(201).json({ success: true, intake: created });
  } catch (error) {
    console.error('Failed to create ihtu intake:', error);
    res.status(500).json({ error: 'Failed to save intake' });
  }
});

export default router;