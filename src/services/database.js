import pg from 'pg';
import dotenv from 'dotenv';
import { log } from '../utils/logger.js';

dotenv.config();

let pool;

export const getPool = () => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set.');
    }
    pool = new pg.Pool({ connectionString });
  }
  return pool;
};

export const initDatabase = async () => {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY,
        username TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS guilds (
        id BIGINT PRIMARY KEY,
        name TEXT,
        alert_channel_id BIGINT,
        alert_time TEXT,
        active_leagues TEXT[] DEFAULT ARRAY['NHL','MLB','NBA','NFL'],
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_teams (
        user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
        guild_id BIGINT REFERENCES guilds(id) ON DELETE CASCADE,
        league TEXT NOT NULL,
        team_id TEXT NOT NULL,
        PRIMARY KEY (user_id, guild_id, league)
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        league TEXT NOT NULL,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        start_time TIMESTAMPTZ NOT NULL,
        broadcast TEXT
      );
    `);
    await client.query('COMMIT');
    log.info('Database initialized');
  } catch (error) {
    await client.query('ROLLBACK');
    log.error('Failed to initialize database', error);
    throw error;
  } finally {
    client.release();
  }
};
