import express from 'express';
import { createClient } from '@supabase/supabase-js';
import postgresProvider from '../providers/postgresProvider.js';
import transporter from '../config/mailer.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

const getSupabase = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// intakeSessionDate removed — now dynamic and not required
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
  'howDidYouHear',
];

const INTAKE_SESSION_ZOOM_LINK = 'https://oakton.zoom.us/j/INTAKE_LINK_PLACEHOLDER';

function isEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

// Returns true if the user (uid, role) has access to the oakton program
async function hasOaktonAccess(uid, role) {
  if (role === 'admin') return true;
  if (role !== 'supervisor') return false;
  const supabase = getSupabase();
  const { data } = await supabase
    .from('user_assignments')
    .select('program_id')
    .eq('user_id', uid)
    .eq('program_id', 'oakton');
  return (data || []).length > 0;
}

router.get('/intakes', authMiddleware, async (_req, res) => {
  try {
    const data = await postgresProvider.getAllOaktonIntakes();
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch oakton intakes:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// PUBLIC — unauthenticated applicants submit this
router.post('/intakes', async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((key) => isEmpty(req.body?.[key]));
    if (missing.length) {
      return res.status(400).json({ error: 'Missing required fields', missing });
    }

    // Check if custom question is active; if so, require an answer
    const supabase = getSupabase();
    const { data: customQ } = await supabase
      .from('custom_questions')
      .select('question_text, is_active')
      .eq('program_id', 'oakton')
      .maybeSingle();

    if (customQ?.is_active && customQ?.question_text && isEmpty(req.body?.customAnswer)) {
      return res.status(400).json({ error: 'Missing required fields', missing: ['customAnswer'] });
    }

    // Snapshot the current question text server-side
    const customQuestionSnapshot =
      customQ?.is_active && customQ?.question_text ? customQ.question_text : null;

    const created = await postgresProvider.createOaktonIntake({
      ...req.body,
      customQuestion: customQuestionSnapshot,
    });

    transporter.sendMail({
      from: `"Oakton WEI Program" <${process.env.GMAIL_USER}>`,
      to: req.body.email,
      subject: 'Your Oakton WEI Application Has Been Received',
      html: `
        <p>Hi ${req.body.firstName},</p>
        <p>We've received your application for the <strong>Oakton Workforce Empowerment Initiative</strong>. Someone from our team will be in contact with you soon.</p>
        <p>A few things to keep in mind:</p>
        <ul>
          ${req.body.intakeSessionDate ? `<li>Please make note of the intake session date you selected: <strong>${req.body.intakeSessionDate}</strong>.</li>` : ''}
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

// === UPDATE INTAKE STATUS ===
router.patch('/intakes/:id/status', authMiddleware, async (req, res) => {
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

      transporter.sendMail({
        from: `"Oakton WEI Program" <${process.env.GMAIL_USER}>`,
        to: updated.email,
        subject: "Congratulations — You've Been Selected for the WEI Grant",
        html: `
          <p>Hi ${updated.first_name},</p>
          <p>We're excited to let you know that you've been <strong>selected to receive the Workforce Empowerment Initiative (WEI) grant</strong>!</p>
          <p>Someone from our team will be reaching out soon with next steps. In the meantime, if you have any questions, feel free to contact us at <a href="mailto:wei@oakton.edu">wei@oakton.edu</a>.</p>
          <p>We look forward to supporting you on your journey.</p>
          <p>— The Oakton WEI Team</p>
        `,
      }).catch((err) => console.error('Acceptance email failed:', err));
    }

    res.json({ success: true, intake: updated });
  } catch (error) {
    console.error('Failed to update intake status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// === GET ENROLLED STUDENTS ===
router.get('/enrolled', authMiddleware, async (_req, res) => {
  try {
    const data = await postgresProvider.getAllOaktonEnrolled();
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch enrolled students:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// === CREATE ENROLLED MANUALLY ===
router.post('/enrolled', authMiddleware, async (req, res) => {
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
router.patch('/enrolled/:id', authMiddleware, async (req, res) => {
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
router.get('/term-dates', authMiddleware, async (_req, res) => {
  try {
    const data = await postgresProvider.getAllTermDates();
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch term dates:', error);
    res.status(500).json({ error: 'Failed to fetch term dates' });
  }
});

router.get('/term-dates/current', authMiddleware, async (_req, res) => {
  try {
    const data = await postgresProvider.getCurrentTermDate();
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch current term:', error);
    res.status(500).json({ error: 'Failed to fetch current term' });
  }
});

router.put('/term-dates', authMiddleware, async (req, res) => {
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

router.delete('/term-dates/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await postgresProvider.deleteTermDate(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Term date not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete term date:', error);
    res.status(500).json({ error: 'Failed to delete term date' });
  }
});

// === INTAKE SESSIONS ===

// PUBLIC — intake form fetches session options on load
router.get('/intake-sessions', async (_req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('intake_sessions')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Failed to fetch intake sessions:', error);
    res.status(500).json({ error: 'Failed to fetch intake sessions' });
  }
});

// PROTECTED — add a new session
router.post('/intake-sessions', authMiddleware, async (req, res) => {
  try {
    if (!await hasOaktonAccess(req.user.uid, req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { label, sort_order } = req.body;
    if (!label?.trim()) {
      return res.status(400).json({ error: 'label is required' });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('intake_sessions')
      .insert({ label: label.trim(), is_active: true, sort_order: sort_order ?? 0 })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, session: data });
  } catch (error) {
    console.error('Failed to create intake session:', error);
    res.status(500).json({ error: 'Failed to create intake session' });
  }
});

// PROTECTED — update a session (label, is_active, sort_order)
router.patch('/intake-sessions/:id', authMiddleware, async (req, res) => {
  try {
    if (!await hasOaktonAccess(req.user.uid, req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = {};
    if (req.body.label !== undefined) updates.label = req.body.label;
    if (req.body.is_active !== undefined) updates.is_active = req.body.is_active;
    if (req.body.sort_order !== undefined) updates.sort_order = req.body.sort_order;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('intake_sessions')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true, session: data });
  } catch (error) {
    console.error('Failed to update intake session:', error);
    res.status(500).json({ error: 'Failed to update intake session' });
  }
});

// PROTECTED — delete a session
router.delete('/intake-sessions/:id', authMiddleware, async (req, res) => {
  try {
    if (!await hasOaktonAccess(req.user.uid, req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('intake_sessions')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete intake session:', error);
    res.status(500).json({ error: 'Failed to delete intake session' });
  }
});

export default router;
