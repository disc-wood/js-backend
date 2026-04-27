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

  async createStudent({ firstname, lastname, email, age }) {
    const sql = `INSERT INTO "oakton-info" (firstname, lastname, email, age) VALUES ($1, $2, $3, $4) RETURNING oaktonid`;
    const { rows } = await pgPool.query(sql, [firstname, lastname, email, age]);
    return rows[0];
  },
  async upsertUser({ firstname, lastname, email, age }) {
    const sql = `
      INSERT INTO "oakton-info" (firstname, lastname, email, age)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (oaktonid) DO UPDATE SET
        email = EXCLUDED.email,
        firstname = EXCLUDED.firstname,
        lastname = EXCLUDED.lastname
      RETURNING oaktonid;
    `;
    const { rows } = await pgPool.query(sql, [firstname, lastname, email, age]);
    return rows[0];
  },

  async getAll() {
    const sql = `SELECT * FROM "oakton-info"`;
    const { rows } = await pgPool.query(sql);
    return rows;
  },

  async getAverageAge() {
    const sql = `SELECT AVG(age) FROM "oakton-info"`;
    const { rows } = await pgPool.query(sql);
    return rows[0]; // because it only returns one value.
  }
  
};