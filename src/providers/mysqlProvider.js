import { pool } from '../config/database.js';

export default {
  // Create a new user (minimal schema: uid + email only)
  async createUser({ uid, email }) {
    const sql = `
      INSERT INTO users (firebase_uid, email)
      VALUES (?, ?)
    `;

    const [result] = await pool.execute(sql, [uid, email]);

    return {
      id: result.insertId,
      uid,
      email,
    };
  },

  // Insert or update user (sync Firebase → DB)
  async upsertUser({ uid, email }) {
    const sql = `
      INSERT INTO users (firebase_uid, email)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        email = VALUES(email)
    `;

    await pool.execute(sql, [uid, email]);

    return this.findByUid(uid);
  },

  // Find user by Firebase UID
  async findByUid(uid) {
    const sql = `
      SELECT id, firebase_uid AS firebaseUid, email
      FROM users
      WHERE firebase_uid = ?
    `;

    const [rows] = await pool.execute(sql, [uid]);
    return rows[0] || null;
  },

  // Get all users (minimal)
  async getAll() {
    const [rows] = await pool.execute(`
      SELECT firebase_uid AS firebaseUid, email
      FROM users
      ORDER BY email ASC
    `);

    return rows;
  },
};