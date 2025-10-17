import { getPool } from './database.js';

export const updateGuildSettings = async ({ guildId, alertChannelId, alertTime, activeLeagues }) => {
  const pool = getPool();
  const fields = [];
  const values = [guildId];
  let idx = 2;

  if (alertChannelId !== undefined) {
    fields.push(`alert_channel_id = $${idx++}`);
    values.push(alertChannelId);
  }

  if (alertTime !== undefined) {
    fields.push(`alert_time = $${idx++}`);
    values.push(alertTime);
  }

  if (activeLeagues !== undefined) {
    fields.push(`active_leagues = $${idx++}`);
    values.push(activeLeagues);
  }

  if (!fields.length) return;

  await pool.query(
    `UPDATE guilds SET ${fields.join(', ')} WHERE id = $1`,
    values
  );
};

export const getGuildSettings = async (guildId) => {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, name, alert_channel_id, alert_time, active_leagues
     FROM guilds
     WHERE id = $1`,
    [guildId]
  );
  return rows[0] ?? null;
};

export const getAllGuilds = async () => {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, name, alert_channel_id, alert_time, active_leagues
     FROM guilds`
  );
  return rows;
};
