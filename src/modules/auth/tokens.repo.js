import crypto from 'node:crypto';
import { query } from '../../db/pool.js';

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function storeRefreshToken({ id, userId, token, expiresAt }) {
  await query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
    [id, userId, hashToken(token), expiresAt]
  );
}

export async function findValidRefreshToken(token) {
  const { rows } = await query(
    `SELECT id, user_id AS "userId" FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [hashToken(token)]
  );
  return rows[0] || null;
}

export async function revokeRefreshToken(token) {
  await query(`UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1`, [hashToken(token)]);
}

export async function revokeAllForUser(userId) {
  await query(`UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
}

export default { hashToken, storeRefreshToken, findValidRefreshToken, revokeRefreshToken, revokeAllForUser };
