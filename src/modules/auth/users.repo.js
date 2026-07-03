import { query } from '../../db/pool.js';

const USER_COLUMNS = `id, org_id AS "orgId", email, role, created_at AS "createdAt"`;

export async function insertUser({ id, orgId, email, passwordHash, role = 'owner' }) {
  const { rows } = await query(
    `INSERT INTO users (id, org_id, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${USER_COLUMNS}`,
    [id, orgId, email.toLowerCase().trim(), passwordHash, role]
  );
  return rows[0];
}

export async function getUserByEmail(email) {
  const { rows } = await query(
    `SELECT ${USER_COLUMNS}, password_hash AS "passwordHash" FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
  return rows[0] || null;
}

export async function getUserById(id) {
  const { rows } = await query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function listUsersByOrg(orgId) {
  const { rows } = await query(`SELECT ${USER_COLUMNS} FROM users WHERE org_id = $1 ORDER BY created_at`, [orgId]);
  return rows;
}

export async function deleteUser(id, orgId) {
  await query(`DELETE FROM users WHERE id = $1 AND org_id = $2`, [id, orgId]);
}

export default { insertUser, getUserByEmail, getUserById, listUsersByOrg, deleteUser };
