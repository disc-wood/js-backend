import { pgPool } from '../config/database.js';

export default {
  async createUser({ uid, email }) {
    const sql = `
      INSERT INTO users (firebase_uid, email)
      VALUES ($1, $2)
      RETURNING id
    `;
    const { rows } = await pgPool.query(sql, [uid, email]);
    return { id: rows[0].id, uid, email };
  },

  async upsertUser({ uid, email }) {
    const sql = `
      INSERT INTO users (firebase_uid, email)
      VALUES ($1, $2)
      ON CONFLICT (firebase_uid)
      DO UPDATE SET email = EXCLUDED.email
    `;
    await pgPool.query(sql, [uid, email]);
    return this.findByUid(uid);
  },

  async findByUid(uid) {
    const sql = `
      SELECT id, firebase_uid AS "firebaseUid", email
      FROM users
      WHERE firebase_uid = $1
    `;
    const { rows } = await pgPool.query(sql, [uid]);
    return rows[0] || null;
  },

  async getAll() {
    const { rows } = await pgPool.query(`
      SELECT firebase_uid AS "firebaseUid", email
      FROM users
      ORDER BY email ASC
    `);
    return rows;
  },

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
      discussed_cultural_competence
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7,
      $8, $9,
      $10, $11,
      $12,
      $13,
      $14
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
        programs_of_interest, term_of_interest, projected_starting_term,
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
        intake_session_date
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20,
        $21, $22, $23, $24,
        $25, $26, $27,
        $28, $29, $30,
        $31, $32, $33, $34,
        $35, $36,
        $37, $38,
        $39, $40,
        $41, $42, $43,
        $44, $45, $46,
        $47, $48,
        $49,
        $50, $51, $52,
        $53
      )
      RETURNING *
    `;

    const values = [
      payload.firstName, payload.lastName, payload.email, payload.phoneNumber,
      payload.dateOfBirth, payload.ageAtEnrollment ?? null,
      payload.racialIdentity, payload.gender, payload.genderOther || null,
      payload.cityZip, payload.cityZipOther || null,
      payload.programsOfInterest || [], payload.termOfInterest, payload.projectedStartingTerm,
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
      payload.intakeSessionDate,
    ];

    const { rows } = await pgPool.query(sql, values);
    return rows[0];
  },
};