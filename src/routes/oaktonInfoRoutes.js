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

// New Oakton intake API (matches frontend field names)
router.get('/intakes', async (_req, res) => {
  try {
    const data = await postgresProvider.getAllOaktonIntakes();
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch oakton intakes:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

router.post('/intakes', async (req, res) => {
  try {
    const missing = requiredFields.filter((k) => req.body?.[k] === undefined || req.body?.[k] === null || req.body?.[k] === '');
    if (missing.length) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing,
      });
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

    const created = await postgresProvider.createOaktonIntake({
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
    console.error('Failed to create oakton intake:', error);
    res.status(500).json({ error: 'Failed to save intake' });
  }
});

router.get('/getAll', async (req, res) => {
  try {
    const data = await postgresProvider.getAll();
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch all:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

router.get('/getAverageAge', async (req, res) => {
  try {
    const data = await postgresProvider.getAverageAge();
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch average age:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

router.post('/upsertUser', async (req, res) => {
  try {
    const { firstname, lastname, email, age } = req.body;
    const data = await postgresProvider.upsertUser({ firstname, lastname, email, age });
    res.json(data);
  } catch (error) {
    console.error('Failed to upsert user:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

router.post('/createStudent', async (req, res) => {
  try {
    const { firstname, lastname, email, age } = req.body;
    const data = await postgresProvider.createStudent({ firstname, lastname, email, age });
    res.json(data);
  } catch (error) {
    console.error('Failed to create student:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

export default router;