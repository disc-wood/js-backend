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

    transporter.sendMail({
      from: `"Oakton WEI Program" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your Oakton WEI Application Has Been Received',
      html: `
        <p>Hi ${firstName},</p>
        <p>Thank you for submitting your <strong>Oakton Workforce Empowerment Initiative</strong> application. We've received your information and will be in touch soon.</p>
        <p>If you have any questions, please email <a href="mailto:wei@oakton.edu">wei@oakton.edu</a>.</p>
        <p>— The Oakton WEI Team</p>
      `,
    }).catch((err) => console.error('Oakton confirmation email failed:', err));

    res.status(201).json({ success: true, ...created });
  } catch (error) {
    console.error('Failed to create oakton intake:', error);
    res.status(500).json({ error: 'Failed to save intake' });
  }
});

router.get('/getAll', async (req, res) => { // provider functions can't be used directly as route handlers because they don't have the req, res signature.
    try {
    const data = await postgresProvider.getAll(); // we need to call the provider.
    res.json(data); // store the result of call into a variable and then send it as json response.
    } 
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

router.get('/getAverageAge', async (req, res) => {
    try {
        const data = await postgresProvider.getAverageAge(); // we need to call the provider.
        res.json(data); // store the result of call into a variable and then send it as json response.
    } 
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

router.post('/upsertUser', async (req, res) => {
    try {
        const { firstname, lastname, email, age } = req.body;
        const data = await postgresProvider.upsertUser({ firstname, lastname, email, age });
        res.json(data);
    }
    catch (error) { 
        res.status(500).json({ error: 'Failed to fetch data' });
    }
}); // send data in the request body, pull the data out of req.body then give to provider.

router.post('/createStudent', async (req, res) => {
   try { 
        const { firstname, lastname, email, age } = req.body;
        const data = await postgresProvider.createStudent({ firstname, lastname, email, age });
        res.json(data);
   }
   catch (error) { 
        res.status(500).json({ error: 'Failed to fetch data'})
   } 
});

export default router;