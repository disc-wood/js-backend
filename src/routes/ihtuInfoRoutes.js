import express from 'express';
import postgresProvider from '../providers/postgresProvider.js';
import transporter from '../config/mailer.js';

const router = express.Router();

const requiredFields = [
  'firstName',
  'lastName',
  'email',
  'phoneNumber',
  'gender',
  'dateOfBirth',
  'ageAtEnrollment',
  'ethnicityRace',
  'currentCity',
  'zipCode',
];

router.get('/intakes', async (_req, res) => {
  try {
    const data = await postgresProvider.getAllIhtuIntakes();
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch IHTU intakes:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

router.post('/intakes', async (req, res) => {
  try {
    const missing = requiredFields.filter(
      (k) => req.body?.[k] === undefined || req.body?.[k] === null || req.body?.[k] === ''
    );
    if (missing.length) {
      return res.status(400).json({ error: 'Missing required fields', missing });
    }

    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      gender,
      dateOfBirth,
      ageAtEnrollment,
      ethnicityRace,
      currentCity,
      zipCode,
    } = req.body;

    const created = await postgresProvider.createIhtuIntake({
      firstName,
      lastName,
      email,
      phoneNumber,
      gender,
      dateOfBirth,
      ageAtEnrollment: Number(ageAtEnrollment),
      ethnicityRace,
      currentCity,
      zipCode,
    });

    transporter.sendMail({
      from: `"I Hope They Understand" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your IHTU Application Has Been Received',
      html: `
        <p>Hi ${firstName},</p>
        <p>Thank you for submitting your <strong>I Hope They Understand</strong> application. We've received your information and will be in touch soon.</p>
        <p>If you have any questions in the meantime, feel free to reply to this email.</p>
        <p>— The IHTU Team</p>
      `,
    }).catch((err) => console.error('IHTU confirmation email failed:', err));

    res.status(201).json({ success: true, ...created });
  } catch (error) {
    console.error('Failed to create IHTU intake:', error);
    res.status(500).json({ error: 'Failed to save intake' });
  }
});

export default router;
