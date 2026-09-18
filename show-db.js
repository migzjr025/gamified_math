const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query('SELECT id, name, email, role, grade, approved, email_verified, first_login_completed FROM users ORDER BY id ASC;');
    console.log('All Users in DB:', res.rows);
  } catch (err) {
    console.error('DB query error:', err);
  } finally {
    await pool.end();
  }
}

checkDb();
