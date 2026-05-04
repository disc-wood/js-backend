import express from 'express';
import postgresProvider from '../providers/postgresProvider.js';

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

    res.status(201).json({ success: true, ...created });
  } catch (error) {
    console.error('Failed to create IHTU intake:', error);
    res.status(500).json({ error: 'Failed to save intake' });
  }
});

export default router;
