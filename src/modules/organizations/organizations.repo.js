import { query } from '../../db/pool.js';

export async function insertOrganization({ id, name, planId = 'free' }) {
  const { rows } = await query(
    `INSERT INTO organizations (id, name, plan_id) VALUES ($1, $2, $3)
     RETURNING id, name, plan_id AS "planId", created_at AS "createdAt"`,
    [id, name, planId]
  );
  return rows[0];
}

export async function getOrganizationById(id) {
  const { rows } = await query(
    `SELECT id, name, plan_id AS "planId", created_at AS "createdAt" FROM organizations WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function updateOrganizationPlan(id, planId) {
  const { rows } = await query(
    `UPDATE organizations SET plan_id = $1 WHERE id = $2
     RETURNING id, name, plan_id AS "planId", created_at AS "createdAt"`,
    [planId, id]
  );
  return rows[0] || null;
}

export default { insertOrganization, getOrganizationById, updateOrganizationPlan };
