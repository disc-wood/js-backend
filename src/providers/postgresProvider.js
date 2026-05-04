import { pgPool } from '../config/database.js';

export default {
  async createOaktonIntake({
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
  }) {
    const sql = `
      INSERT INTO "oakton-info" (
        firstname,
        lastname,
        email,
        phone_num,
        gender,
        birthday,
        age,
        race,
        current_city,
        zip_code
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING oaktonid;
    `;

    const phoneDigits = String(phoneNumber || '').replace(/\D/g, '');
    const phoneAsBigInt = phoneDigits ? BigInt(phoneDigits).toString() : null;

    const values = [
      firstName,
      lastName,
      email,
      phoneAsBigInt,
      gender,
      dateOfBirth,
      ageAtEnrollment,
      ethnicityRace,
      currentCity,
      zipCode,
    ];

    const { rows } = await pgPool.query(sql, values);
    return rows[0];
  },

  async createIhtuIntake({
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
  }) {
    const sql = `
      INSERT INTO "ihtu-info" (
        firstname,
        lastname,
        email,
        phone_num,
        gender,
        birthday,
        age,
        race,
        current_city,
        zip_code
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING ihtuid;
    `;

    const phoneDigits = String(phoneNumber || '').replace(/\D/g, '');
    const phoneAsBigInt = phoneDigits ? BigInt(phoneDigits).toString() : null;

    const { rows } = await pgPool.query(sql, [
      firstName,
      lastName,
      email,
      phoneAsBigInt,
      gender,
      dateOfBirth,
      ageAtEnrollment,
      ethnicityRace,
      currentCity,
      zipCode,
    ]);
    return rows[0];
  },

  async getAllIhtuIntakes() {
    const sql = `
      SELECT
        ihtuid AS id,
        firstname AS "firstName",
        lastname AS "lastName",
        email,
        phone_num AS "phoneNumber",
        gender,
        birthday AS "dateOfBirth",
        age AS "ageAtEnrollment",
        race AS "ethnicityRace",
        current_city AS "currentCity",
        zip_code AS "zipCode"
      FROM "ihtu-info"
      ORDER BY ihtuid DESC;
    `;
    const { rows } = await pgPool.query(sql);
    return rows;
  },

  async getAllOaktonIntakes() {
    const sql = `
      SELECT
        oaktonid AS id,
        firstname AS "firstName",
        lastname AS "lastName",
        email,
        phone_num AS "phoneNumber",
        gender,
        birthday AS "dateOfBirth",
        age AS "ageAtEnrollment",
        race AS "ethnicityRace",
        current_city AS "currentCity",
        zip_code AS "zipCode"
      FROM "oakton-info"
      ORDER BY oaktonid DESC;
    `;
    const { rows } = await pgPool.query(sql);
    return rows;
  },

  async createUser({ uid, username, email, firstname, lastname }) {
    const sql = `
      INSERT INTO admins (firebase_uid, username, email, firstname, lastname)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const { rows } = await pgPool.query(sql, [uid, username, email, firstname, lastname]);
    return rows[0];
  },

  async findByUid(uid) {
    const sql = `SELECT * FROM admins WHERE firebase_uid = $1 LIMIT 1;`;
    const { rows } = await pgPool.query(sql, [uid]);
    return rows[0] || null;
  },

  async upsertUser({ uid, username, email, firstname, lastname }) {
    const sql = `
      INSERT INTO admins (firebase_uid, username, email, firstname, lastname)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (firebase_uid) DO UPDATE SET
        email       = EXCLUDED.email,
        firstname   = EXCLUDED.firstname,
        lastname    = EXCLUDED.lastname,
        updated_at  = NOW()
      RETURNING *;
    `;
    const { rows } = await pgPool.query(sql, [uid, username, email, firstname, lastname]);
    return rows[0];
  },

  async getAll() {
    const sql = `SELECT * FROM admins ORDER BY created_at DESC;`;
    const { rows } = await pgPool.query(sql);
    return rows;
  },

  async getAverageAge() {
    const sql = `SELECT AVG(age) FROM "oakton-info"`;
    const { rows } = await pgPool.query(sql);
    return rows[0]; // because it only returns one value.
  }
  
};