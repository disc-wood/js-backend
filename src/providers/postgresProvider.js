import { pgPool } from '../config/database.js';

export default {
  // Create a new user (minimal schema)
  async createUser({ uid, email }) {
    const sql = `
      INSERT INTO users (firebase_uid, email)
      VALUES ($1, $2)
      RETURNING id
    `;

    const { rows } = await pgPool.query(sql, [uid, email]);

    return {
      id: rows[0].id,
      uid,
      email,
    };
  },

  // Upsert user (Firebase sync → DB)
  async upsertUser({ uid, email }) {
    const sql = `
      INSERT INTO users (firebase_uid, email)
      VALUES ($1, $2)
      ON CONFLICT (firebase_uid)
      DO UPDATE SET
        email = EXCLUDED.email
    `;

    await pgPool.query(sql, [uid, email]);

    return this.findByUid(uid);
  },

  // Find user by Firebase UID
  async findByUid(uid) {
    const sql = `
      SELECT id,
             firebase_uid AS "firebaseUid",
             email
      FROM users
      WHERE firebase_uid = $1
    `;

    const { rows } = await pgPool.query(sql, [uid]);
    return rows[0] || null;
  },

  // Get all users
  async getAll() {
    const { rows } = await pgPool.query(`
      SELECT firebase_uid AS "firebaseUid", email
      FROM users
      ORDER BY email ASC
    `);

    return rows;
  },

  async getAllIhtuIntakes() {
    const { rows } = await pgPool.query(
      `SELECT * FROM "ihtu-info" ORDER BY ihtuid DESC`
    );
    return rows;
  },

  async createIhtuIntake({ firstName, lastName, email, phoneNumber, gender, dateOfBirth, ageAtEnrollment, ethnicityRace, currentCity, zipCode }) {
    // phone_num is BIGINT in Supabase — strip non-digits before inserting
    const phoneDigits = phoneNumber ? Number(String(phoneNumber).replace(/\D/g, '')) : null;
    const sql = `
      INSERT INTO "ihtu-info"
        (firstname, lastname, email, phone_num, gender, birthday, age, race, current_city, zip_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const { rows } = await pgPool.query(sql, [
      firstName, lastName, email, phoneDigits, gender,
      dateOfBirth, ageAtEnrollment, ethnicityRace, currentCity, zipCode,
    ]);
    return rows[0];
  },

  async getAllOaktonIntakes() {
    const { rows } = await pgPool.query(
      `SELECT * FROM "oakton-info" ORDER BY oaktonid DESC`
    );
    return rows;
  },

  async createOaktonIntake({ firstName, lastName, email, phoneNumber, gender, dateOfBirth, ageAtEnrollment, ethnicityRace, currentCity, zipCode }) {
    // phone_num is BIGINT in Supabase — strip non-digits before inserting
    const phoneDigits = phoneNumber ? Number(String(phoneNumber).replace(/\D/g, '')) : null;
    const sql = `
      INSERT INTO "oakton-info"
        (firstname, lastname, email, phone_num, gender, birthday, age, race, current_city, zip_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const { rows } = await pgPool.query(sql, [
      firstName, lastName, email, phoneDigits, gender,
      dateOfBirth, ageAtEnrollment, ethnicityRace, currentCity, zipCode,
    ]);
    return rows[0];
  },
};