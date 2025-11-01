import pool from '../config/database';
import bcrypt from 'bcryptjs';
import { User, RegisterRequest, UpdateProfileRequest } from '../types';

export class UserModel {
  static async create(userData: RegisterRequest): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const result = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name, is_admin, created_at, updated_at`,
      [userData.email, hashedPassword, userData.firstName, userData.lastName]
    );

    return this.mapRow(result.rows[0]);
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  static async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  static async update(id: string, userData: UpdateProfileRequest): Promise<User | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (userData.firstName) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(userData.firstName);
    }

    if (userData.lastName) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(userData.lastName);
    }

    if (userData.newPassword) {
      const hashedPassword = await bcrypt.hash(userData.newPassword, 12);
      updates.push(`password = $${paramCount++}`);
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}
       RETURNING id, email, first_name, last_name, is_admin, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  static async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  static async findAll(limit: number = 50, offset: number = 0): Promise<{ users: User[]; total: number }> {
    const [usersResult, countResult] = await Promise.all([
      pool.query(
        `SELECT id, email, first_name, last_name, is_admin, created_at, updated_at
         FROM users
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM users')
    ]);

    return {
      users: usersResult.rows.map(row => this.mapRow(row)),
      total: parseInt(countResult.rows[0].count)
    };
  }

  static async deleteById(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );

    return result.rowCount > 0;
  }

  private static mapRow(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password: row.password || '',
      firstName: row.first_name,
      lastName: row.last_name,
      isAdmin: row.is_admin,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}