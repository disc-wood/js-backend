import { pgPool } from '../config/database.js';

export default {
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