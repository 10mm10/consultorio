import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

const result = dotenv.config({
  path: path.join(process.cwd(), '.env'),
  override: true,
});
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS,
  database: process.env.DB_NAME || 'consultorio_estetica',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});