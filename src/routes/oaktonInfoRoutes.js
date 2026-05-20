import express from 'express';
import postgresProvider from '../providers/postgresProvider.js';
import transporter from '../config/mailer.js';

const router = express.Router();

const REQUIRED_FIELDS = [
  'firstName', 'lastName', 'email', 'phoneNumber', 'dateOfBirth',
  'racialIdentity', 'gender', 'cityZip',
  'programsOfInterest', 'termOfInterest', 'projectedStartingTerm',
  'workAuthorization', 'employmentStatus',
  'annualIncome', 'householdSize',
  'programFormat', 'englishProficiency',
  'isCurrentOaktonStudent', 'hasTakenOaktonClasses',
  'hasAppliedForFafsa', 'hasReceivedWei',
  'otherProgramsAppliedTo', 'highestEducation', 'longTermGoals', 'professionalGoals',
  'hasPersonalIssues', 'transportationConcern', 'childcareConcern',
  'canAttendClasses', 'hasGoodStudyHabits', 'canSpendStudyHours',
  'hasInternetAccess', 'hasComputerAccess', 'isSelfMotivated',
  'needsAccommodations',
  'agreesToTerms',
  'howDidYouHear', 'intakeSessionDate',
];

function isEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

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
    const missing = REQUIRED_FIELDS.filter((key) => isEmpty(req.body?.[key]));
    if (missing.length) {
      return res.status(400).json({ error: 'Missing required fields', missing });
    }

    const created = await postgresProvider.createOaktonIntake(req.body);

    transporter.sendMail({
      from: `"Oakton WEI Program" <${process.env.GMAIL_USER}>`,
      to: req.body.email,
      subject: 'Your Oakton WEI Application Has Been Received',
      html: `
        <p>Hi ${req.body.firstName},</p>
        <p>Thank you for submitting your <strong>Oakton Workforce Empowerment Initiative</strong> application. We've received your information and will be in touch soon.</p>
        <p>If you have any questions, please email <a href="mailto:wei@oakton.edu">wei@oakton.edu</a>.</p>
        <p>— The Oakton WEI Team</p>
      `,
    }).catch((err) => console.error('Oakton confirmation email failed:', err));

    res.status(201).json({ success: true, intake: created });
  } catch (error) {
    console.error('Failed to create oakton intake:', error);
    res.status(500).json({ error: 'Failed to save intake' });
  }
});

router.get('/getAll', async (_req, res) => {
  try {
    const data = await postgresProvider.getAll();
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch all:', error);
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

export default router;