import express from 'express';
import postgresProvider from '../providers/postgresProvider.js';
import transporter from '../config/mailer.js';

const router = express.Router();

const REQUIRED_FIELDS = [
  'firstName', 'lastName', 'email', 'phoneNumber', 'dateOfBirth',
  'racialIdentity', 'gender', 'cityZip',
  'programsOfInterest',
  'projectedStartingTermYear', 'projectedStartingTermSeason',
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

const INTAKE_SESSION_ZOOM_LINK = 'https://oakton.zoom.us/j/INTAKE_LINK_PLACEHOLDER';

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
        <p>We've received your application for the <strong>Oakton Workforce Empowerment Initiative</strong>. Someone from our team will be in contact with you soon.</p>
        <p>A few things to keep in mind:</p>
        <ul>
          <li>Please make note of the intake session date you selected: <strong>${req.body.intakeSessionDate}</strong>.</li>
          <li>Your intake session Zoom link: <a href="${INTAKE_SESSION_ZOOM_LINK}">${INTAKE_SESSION_ZOOM_LINK}</a></li>
          <li>Make sure you submit your supporting documents before the session.</li>
        </ul>
        <p>Questions? Email <a href="mailto:wei@oakton.edu">wei@oakton.edu</a>.</p>
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

// === UPDATE INTAKE STATUS ===
router.patch('/intakes/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Applied', 'Accepted', 'Rejected', 'Waitlisted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status', validStatuses });
    }

    const updated = await postgresProvider.updateOaktonIntakeStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: 'Intake not found' });
    }

    if (status === 'Accepted') {
  try {
    const alreadyEnrolled = await postgresProvider.getOaktonEnrolledByIntakeId(id);
    if (!alreadyEnrolled) {
      await postgresProvider.createOaktonEnrolledFromIntake(id);
    }
  } catch (err) {
    console.error('Failed to auto-create enrolled record:', err);
  }
}

    res.json({ success: true, intake: updated });
  } catch (error) {
    console.error('Failed to update intake status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// === GET ENROLLED STUDENTS ===
router.get('/enrolled', async (_req, res) => {
  try {
    const data = await postgresProvider.getAllOaktonEnrolled();
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch enrolled students:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// === CREATE ENROLLED MANUALLY ===
router.post('/enrolled', async (req, res) => {
  try {
    const { intakeId } = req.body;
    if (!intakeId) {
      return res.status(400).json({ error: 'intakeId is required' });
    }

    const created = await postgresProvider.createOaktonEnrolledFromIntake(intakeId);
    res.status(201).json({ success: true, enrolled: created });
  } catch (error) {
    console.error('Failed to create enrolled record:', error);
    res.status(500).json({ error: error.message || 'Failed to create enrolled record' });
  }
});

// === UPDATE ENROLLED STUDENT FIELDS ===
router.patch('/enrolled/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await postgresProvider.updateOaktonEnrolled(id, req.body);

    if (!updated) {
      return res.status(404).json({ error: 'Enrolled record not found' });
    }

    res.json({ success: true, enrolled: updated });
  } catch (error) {
    console.error('Failed to update enrolled record:', error);
    res.status(500).json({ error: error.message || 'Failed to update record' });
  }
});

// === TERM DATES ===
router.get('/term-dates', async (_req, res) => {
  try {
    const data = await postgresProvider.getAllTermDates();
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch term dates:', error);
    res.status(500).json({ error: 'Failed to fetch term dates' });
  }
});

router.get('/term-dates/current', async (_req, res) => {
  try {
    const data = await postgresProvider.getCurrentTermDate();
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch current term:', error);
    res.status(500).json({ error: 'Failed to fetch current term' });
  }
});

router.put('/term-dates', async (req, res) => {
  try {
    const { year, season, session, startDate, endDate } = req.body;
    if (!year || !season || !startDate || !endDate) {
      return res.status(400).json({ error: 'year, season, startDate, endDate are required' });
    }
    const data = await postgresProvider.upsertTermDate({ year, season, session, startDate, endDate });
    res.json({ success: true, termDate: data });
  } catch (error) {
    console.error('Failed to upsert term date:', error);
    res.status(500).json({ error: 'Failed to save term date' });
  }
});

router.delete('/term-dates/:id', async (req, res) => {
  try {
    const deleted = await postgresProvider.deleteTermDate(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Term date not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete term date:', error);
    res.status(500).json({ error: 'Failed to delete term date' });
  }
});

export default router;