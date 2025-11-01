import pool from '../config/database';
import { GeneratedPass, CreatePassRequest, PassTemplateData } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class GeneratedPassModel {
  static async create(
    userId: string,
    passData: PassTemplateData,
    walletType: 'apple' | 'google',
    templateId?: string
  ): Promise<GeneratedPass> {
    const serialNumber = this.generateSerialNumber();

    const result = await pool.query(
      `INSERT INTO generated_passes (user_id, template_id, pass_data, wallet_type, serial_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, templateId || null, JSON.stringify(passData), walletType, serialNumber]
    );

    return this.mapRow(result.rows[0]);
  }

  static async findById(id: string): Promise<GeneratedPass | null> {
    const result = await pool.query(
      'SELECT * FROM generated_passes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  static async findBySerialNumber(serialNumber: string, walletType: 'apple' | 'google'): Promise<GeneratedPass | null> {
    const result = await pool.query(
      'SELECT * FROM generated_passes WHERE serial_number = $1 AND wallet_type = $2',
      [serialNumber, walletType]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  static async findByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    walletType?: 'apple' | 'google'
  ): Promise<{ passes: GeneratedPass[]; total: number }> {
    const whereClause = walletType ? 'WHERE user_id = $1 AND wallet_type = $4' : 'WHERE user_id = $1';
    const params = walletType ? [userId, limit, offset, walletType] : [userId, limit, offset];

    const [passesResult, countResult] = await Promise.all([
      pool.query(
        `SELECT gp.*, pt.name as template_name
         FROM generated_passes gp
         LEFT JOIN pass_templates pt ON gp.template_id = pt.id
         ${whereClause}
         ORDER BY gp.created_at DESC
         LIMIT $2 OFFSET $3`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) FROM generated_passes ${whereClause.replace(/\$2|\$3|\$4/g, (match) => {
          if (match === '$2' || match === '$3') return '';
          return match;
        })}`,
        walletType ? [userId, walletType] : [userId]
      )
    ]);

    return {
      passes: passesResult.rows.map(row => ({
        ...this.mapRow(row),
        templateName: row.template_name,
      })),
      total: parseInt(countResult.rows[0].count)
    };
  }

  static async findAll(
    limit: number = 50,
    offset: number = 0,
    walletType?: 'apple' | 'google'
  ): Promise<{ passes: GeneratedPass[]; total: number }> {
    const whereClause = walletType ? 'WHERE gp.wallet_type = $3' : '';
    const params = walletType ? [limit, offset, walletType] : [limit, offset];

    const [passesResult, countResult] = await Promise.all([
      pool.query(
        `SELECT gp.*, pt.name as template_name, u.email as user_email, u.first_name, u.last_name
         FROM generated_passes gp
         LEFT JOIN pass_templates pt ON gp.template_id = pt.id
         JOIN users u ON gp.user_id = u.id
         ${whereClause}
         ORDER BY gp.created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) FROM generated_passes gp ${whereClause.replace(/\$3/g, 'WHERE gp.wallet_type = $1')}`,
        walletType ? [walletType] : []
      )
    ]);

    return {
      passes: passesResult.rows.map(row => ({
        ...this.mapRow(row),
        templateName: row.template_name,
        userEmail: row.user_email,
        userFirstName: row.first_name,
        userLastName: row.last_name,
      })),
      total: parseInt(countResult.rows[0].count)
    };
  }

  static async updateUrls(id: string, qrCodeUrl?: string, downloadUrl?: string): Promise<GeneratedPass | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (qrCodeUrl !== undefined) {
      updates.push(`qr_code_url = $${paramCount++}`);
      values.push(qrCodeUrl);
    }

    if (downloadUrl !== undefined) {
      updates.push(`download_url = $${paramCount++}`);
      values.push(downloadUrl);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE generated_passes SET ${updates.join(', ')}
       WHERE id = $${paramCount}
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
      ? 'DELETE FROM generated_passes WHERE id = $1 AND user_id = $2'
      : 'DELETE FROM generated_passes WHERE id = $1';

    const params = userId ? [id, userId] : [id];

    const result = await pool.query(query, params);
    return result.rowCount > 0;
  }

  static async getStats(userId?: string): Promise<{
    totalPasses: number;
    applePasses: number;
    googlePasses: number;
    todayPasses: number;
  }> {
    const whereClause = userId ? 'WHERE user_id = $1' : '';
    const params = userId ? [userId] : [];

    const result = await pool.query(
      `SELECT
         COUNT(*) as total_passes,
         COUNT(CASE WHEN wallet_type = 'apple' THEN 1 END) as apple_passes,
         COUNT(CASE WHEN wallet_type = 'google' THEN 1 END) as google_passes,
         COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_passes
       FROM generated_passes
       ${whereClause}`,
      params
    );

    const stats = result.rows[0];
    return {
      totalPasses: parseInt(stats.total_passes),
      applePasses: parseInt(stats.apple_passes),
      googlePasses: parseInt(stats.google_passes),
      todayPasses: parseInt(stats.today_passes),
    };
  }

  private static generateSerialNumber(): string {
    return `WT-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
  }

  private static mapRow(row: any): GeneratedPass {
    return {
      id: row.id,
      userId: row.user_id,
      templateId: row.template_id,
      passData: row.pass_data,
      walletType: row.wallet_type,
      serialNumber: row.serial_number,
      qrCodeUrl: row.qr_code_url,
      downloadUrl: row.download_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}