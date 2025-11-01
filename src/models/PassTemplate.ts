import pool from '../config/database';
import { PassTemplate, CreateTemplateRequest } from '../types';

export class PassTemplateModel {
  static async create(userId: string, templateData: CreateTemplateRequest): Promise<PassTemplate> {
    const result = await pool.query(
      `INSERT INTO pass_templates (user_id, name, description, template)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, templateData.name, templateData.description, JSON.stringify(templateData.template)]
    );

    return this.mapRow(result.rows[0]);
  }

  static async findById(id: string): Promise<PassTemplate | null> {
    const result = await pool.query(
      'SELECT * FROM pass_templates WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  static async findByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<{ templates: PassTemplate[]; total: number }> {
    const [templatesResult, countResult] = await Promise.all([
      pool.query(
        `SELECT * FROM pass_templates
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      pool.query(
        'SELECT COUNT(*) FROM pass_templates WHERE user_id = $1',
        [userId]
      )
    ]);

    return {
      templates: templatesResult.rows.map(row => this.mapRow(row)),
      total: parseInt(countResult.rows[0].count)
    };
  }

  static async findAll(limit: number = 50, offset: number = 0): Promise<{ templates: PassTemplate[]; total: number }> {
    const [templatesResult, countResult] = await Promise.all([
      pool.query(
        `SELECT pt.*, u.email as user_email, u.first_name, u.last_name
         FROM pass_templates pt
         JOIN users u ON pt.user_id = u.id
         ORDER BY pt.updated_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM pass_templates')
    ]);

    return {
      templates: templatesResult.rows.map(row => ({
        ...this.mapRow(row),
        userEmail: row.user_email,
        userFirstName: row.first_name,
        userLastName: row.last_name,
      })),
      total: parseInt(countResult.rows[0].count)
    };
  }

  static async update(id: string, userId: string, templateData: Partial<CreateTemplateRequest>): Promise<PassTemplate | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (templateData.name) {
      updates.push(`name = $${paramCount++}`);
      values.push(templateData.name);
    }

    if (templateData.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(templateData.description);
    }

    if (templateData.template) {
      updates.push(`template = $${paramCount++}`);
      values.push(JSON.stringify(templateData.template));
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id, userId);

    const result = await pool.query(
      `UPDATE pass_templates SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  static async deleteById(id: string, userId?: string): Promise<boolean> {
    const query = userId
      ? 'DELETE FROM pass_templates WHERE id = $1 AND user_id = $2'
      : 'DELETE FROM pass_templates WHERE id = $1';

    const params = userId ? [id, userId] : [id];

    const result = await pool.query(query, params);
    return result.rowCount > 0;
  }

  private static mapRow(row: any): PassTemplate {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      template: row.template,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}