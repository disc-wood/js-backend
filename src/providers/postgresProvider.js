import { pgPool } from '../config/database.js';

export default {
  // === IHTU INTAKE ===
  async getAllIhtuIntakes() {
    const { rows } = await pgPool.query(
      `SELECT * FROM ihtu_intakes ORDER BY submitted_at DESC`
    );
    return rows;
  },

  async createIhtuIntake(payload) {
    const sql = `
      INSERT INTO ihtu_intakes (
        first_name, last_name, email, phone_number, gender,
        date_of_birth, age_at_enrollment,
        ethnicity_race, ethnicity_race_other,
        current_city, zip_code,
        knows_healthy_racial_identity,
        discussed_racial_identity,
        discussed_cultural_competence,
        custom_question, custom_answer
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7,
        $8, $9,
        $10, $11,
        $12,
        $13,
        $14,
        $15, $16
      )
      RETURNING *
    `;

    const values = [
      payload.firstName,
      payload.lastName,
      payload.email,
      payload.phoneNumber,
      payload.gender,
      payload.dateOfBirth,
      payload.ageAtEnrollment ?? null,
      payload.ethnicityRace,
      payload.ethnicityRaceOther || null,
      payload.currentCity,
      payload.zipCode,
      payload.knowsHealthyRacialIdentity,
      payload.discussedRacialIdentity,
      payload.discussedCulturalCompetence,
      payload.customQuestion || null,
      payload.customAnswer || null,
    ];

    const { rows } = await pgPool.query(sql, values);
    return rows[0];
  },

  // === OAKTON INTAKE ===
  async getAllOaktonIntakes() {
    const { rows } = await pgPool.query(
      `SELECT * FROM oakton_intakes ORDER BY submitted_at DESC`
    );
    return rows;
  },

  async createOaktonIntake(payload) {
    const sql = `
      INSERT INTO oakton_intakes (
        first_name, last_name, email, phone_number, date_of_birth, age_at_enrollment,
        racial_identity, gender, gender_other, city_zip, city_zip_other,
        programs_of_interest,
        projected_starting_term_year, projected_starting_term_season, projected_starting_term_summer_session,
        work_authorization, work_authorization_other, employment_status, weekly_work_hours,
        annual_income, household_size,
        program_format, program_format_other, english_proficiency, english_proficiency_other,
        esl_level, is_current_oakton_student, has_taken_oakton_classes,
        current_enrollment_details, has_applied_for_fafsa, has_received_wei,
        other_programs_applied_to, highest_education, long_term_goals, professional_goals,
        has_personal_issues, personal_issues_explanation,
        transportation_concern, transportation_explanation,
        childcare_concern, childcare_explanation,
        can_attend_classes, has_good_study_habits, can_spend_study_hours,
        has_internet_access, has_computer_access, is_self_motivated,
        needs_accommodations, accommodations_explanation,
        agrees_to_terms,
        other_comments, how_did_you_hear, how_did_you_hear_other,
        intake_session_date,
        custom_question, custom_answer
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12,
        $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21,
        $22, $23, $24, $25,
        $26, $27, $28,
        $29, $30, $31,
        $32, $33, $34, $35,
        $36, $37,
        $38, $39,
        $40, $41,
        $42, $43, $44,
        $45, $46, $47,
        $48, $49,
        $50,
        $51, $52, $53,
        $54,
        $55, $56
      )
      RETURNING *
    `;

    const values = [
      payload.firstName, payload.lastName, payload.email, payload.phoneNumber,
      payload.dateOfBirth, payload.ageAtEnrollment ?? null,
      payload.racialIdentity, payload.gender, payload.genderOther || null,
      payload.cityZip, payload.cityZipOther || null,
      payload.programsOfInterest || [],
      payload.projectedStartingTermYear || null,
      payload.projectedStartingTermSeason || null,
      payload.projectedStartingTermSummerSession || null,
      payload.workAuthorization, payload.workAuthorizationOther || null,
      payload.employmentStatus || [], payload.weeklyWorkHours || null,
      payload.annualIncome, payload.householdSize,
      payload.programFormat, payload.programFormatOther || null,
      payload.englishProficiency, payload.englishProficiencyOther || null,
      payload.eslLevel || null, payload.isCurrentOaktonStudent, payload.hasTakenOaktonClasses,
      payload.currentEnrollmentDetails || null, payload.hasAppliedForFafsa, payload.hasReceivedWei,
      payload.otherProgramsAppliedTo || [], payload.highestEducation,
      payload.longTermGoals, payload.professionalGoals,
      payload.hasPersonalIssues, payload.personalIssuesExplanation || null,
      payload.transportationConcern, payload.transportationExplanation || null,
      payload.childcareConcern, payload.childcareExplanation || null,
      payload.canAttendClasses, payload.hasGoodStudyHabits, payload.canSpendStudyHours,
      payload.hasInternetAccess, payload.hasComputerAccess, payload.isSelfMotivated,
      payload.needsAccommodations, payload.accommodationsExplanation || null,
      payload.agreesToTerms,
      payload.otherComments || null, payload.howDidYouHear, payload.howDidYouHearOther || null,
      payload.intakeSessionDate || null,
      payload.customQuestion || null,
      payload.customAnswer || null,
    ];

    const { rows } = await pgPool.query(sql, values);
    return rows[0];
  },

  // === OAKTON INTAKE STATUS ===
  async updateOaktonIntakeStatus(id, status) {
    const sql = `
      UPDATE oakton_intakes
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const { rows } = await pgPool.query(sql, [status, id]);
    return rows[0];
  },

  // === OAKTON ENROLLED ===
  async getAllOaktonEnrolled() {
    const { rows } = await pgPool.query(
      `SELECT * FROM oakton_enrolled WHERE is_archived = FALSE ORDER BY enrolled_at DESC`
    );
    return rows;
  },

  async createOaktonEnrolledFromIntake(intakeId) {
  const { rows: intakeRows } = await pgPool.query(
    `SELECT * FROM oakton_intakes WHERE id = $1`,
    [intakeId]
  );
  const intake = intakeRows[0];
  if (!intake) throw new Error('Intake not found');

  // Look up matching term dates
  const { rows: termRows } = await pgPool.query(
    `SELECT * FROM term_dates
     WHERE year = $1 AND season = $2
     AND (session = $3 OR (session IS NULL AND $3 IS NULL))`,
    [
      intake.projected_starting_term_year,
      intake.projected_starting_term_season,
      intake.projected_starting_term_summer_session || null,
    ]
  );
  const termDate = termRows[0] || null;

  const programName = Array.isArray(intake.programs_of_interest) && intake.programs_of_interest.length
    ? intake.programs_of_interest[0]
    : null;

  const sql = `
    INSERT INTO oakton_enrolled (
      intake_id, first_name, last_name, email, phone_number, program_name,
      term, program_year, start_date, end_date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;

  const { rows } = await pgPool.query(sql, [
    intake.id,
    intake.first_name,
    intake.last_name,
    intake.email,
    intake.phone_number,
    programName,
    intake.projected_starting_term_season,
    intake.projected_starting_term_year,
    termDate?.start_date || null,
    termDate?.end_date || null,
  ]);
  return rows[0];
},

  async updateOaktonEnrolled(id, updates) {
    // Allowed fields supervisors can edit (whitelist for security)
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone_number',
      'program_name', 'program_status', 'program_year', 'term',
      'start_date', 'end_date', 'continuing_student',
      'first_attendance_verified', 'second_attendance_verified',
      'follow_up_needed', 'follow_up_date', 'transition_to_work_date',
      'permit_exam_date', 'certification_name', 'certification_status',
      'exam_passed', 'assessment_notes', 'employability_skills_notes',
      'employment_specialist', 'is_employed', 'date_of_hire',
      'employment_verification_source', 'employer_name', 'employer_address',
      'employer_city', 'employer_industry', 'hourly_wage', 'annual_wage',
      'general_notes', 'is_archived',
    ];

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);
    const sql = `
      UPDATE oakton_enrolled
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const { rows } = await pgPool.query(sql, values);
    return rows[0];
  },
  // === TERM DATES ===
async getAllTermDates() {
  const { rows } = await pgPool.query(
    `SELECT * FROM term_dates ORDER BY year ASC, season ASC, session ASC`
  );
  return rows;
},

async upsertTermDate({ year, season, session, startDate, endDate }) {
  const sessionVal = session || null;
  // ON CONFLICT doesn't work with nullable session (NULL != NULL in unique constraints),
  // so do UPDATE first, then INSERT if no row matched.
  const { rows: updated } = await pgPool.query(
    `UPDATE term_dates
     SET start_date = $4, end_date = $5
     WHERE year = $1 AND season = $2
       AND (session = $3 OR (session IS NULL AND $3 IS NULL))
     RETURNING *`,
    [year, season, sessionVal, startDate, endDate],
  );
  if (updated.length > 0) return updated[0];

  const { rows: inserted } = await pgPool.query(
    `INSERT INTO term_dates (year, season, session, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [year, season, sessionVal, startDate, endDate],
  );
  return inserted[0];
},

async deleteTermDate(id) {
    const { rows } = await pgPool.query(
      `DELETE FROM term_dates WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  },

  // ← ADD THIS inside the object, before the closing };
  async getOaktonEnrolledByIntakeId(intakeId) {
    const { rows } = await pgPool.query(
      `SELECT id FROM oakton_enrolled WHERE intake_id = $1 LIMIT 1`,
      [intakeId]
    );
    return rows[0] || null;
  },
  async getCurrentTermDate() {
  const { rows } = await pgPool.query(
    `SELECT * FROM term_dates
     WHERE CURRENT_DATE BETWEEN start_date AND end_date
     ORDER BY start_date DESC
     LIMIT 1`
  );
  return rows[0] || null;
},
};