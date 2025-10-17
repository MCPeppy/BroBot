import { getPool } from './database.js';

export const ensureUser = async (user) => {
  const pool = getPool();
  await pool.query(
    `INSERT INTO users (id, username)
     VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username`,
    [user.id, user.username]
  );
};

export const ensureGuild = async (guild) => {
  const pool = getPool();
  await pool.query(
    `INSERT INTO guilds (id, name)
     VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [guild.id, guild.name]
  );
};

export const setUserTeam = async ({ userId, guildId, league, teamId }) => {
  const pool = getPool();
  await pool.query(
    `INSERT INTO user_teams (user_id, guild_id, league, team_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, guild_id, league) DO UPDATE SET team_id = EXCLUDED.team_id`,
    [userId, guildId, league, teamId]
  );
};

export const getUserTeams = async ({ userId, guildId }) => {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT league, team_id
     FROM user_teams
     WHERE user_id = $1 AND guild_id = $2
     ORDER BY league`,
    [userId, guildId]
  );
  return rows;
};

export const clearUserTeams = async ({ userId, guildId, league }) => {
  const pool = getPool();
  if (league) {
    await pool.query(
      `DELETE FROM user_teams
       WHERE user_id = $1 AND guild_id = $2 AND league = $3`,
      [userId, guildId, league]
    );
  } else {
    await pool.query(
      `DELETE FROM user_teams
       WHERE user_id = $1 AND guild_id = $2`,
      [userId, guildId]
    );
  }
};

export const getGuildUserTeams = async (guildId) => {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT user_id, league, team_id
     FROM user_teams
     WHERE guild_id = $1`,
    [guildId]
  );
  return rows;
};
