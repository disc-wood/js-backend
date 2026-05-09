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
};