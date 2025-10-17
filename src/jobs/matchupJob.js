import cron from 'node-cron';
import { getAllGuilds } from '../services/guildService.js';
import { findAndFormatMatchups } from '../services/matchupService.js';
import { log } from '../utils/logger.js';

const DEFAULT_ALERT_HOUR = '09:00';

const shouldRunForGuild = (guildSettings, now) => {
  const alertTime = guildSettings.alert_time || DEFAULT_ALERT_HOUR;
  const [hour, minute] = alertTime.split(':').map((value) => parseInt(value, 10));
  return now.getHours() === hour && now.getMinutes() === minute;
};

export const scheduleMatchupJob = (client) => {
  cron.schedule('0 * * * *', async () => {
    const now = new Date();
    log.info('Running hourly matchup sweep', now.toISOString());
    const guilds = await getAllGuilds();
    for (const guild of guilds) {
      if (!guild.alert_channel_id) continue;
      if (!shouldRunForGuild(guild, now)) continue;

      const discordGuild = client.guilds.cache.get(String(guild.id));
      if (!discordGuild) continue;
      const channel = discordGuild.channels.cache.get(String(guild.alert_channel_id));
      if (!channel || !channel.isTextBased()) continue;

      try {
        const messages = await findAndFormatMatchups(guild, client);
        for (const message of messages) {
          await channel.send(message);
        }
        if (!messages.length) {
          log.info(`No matchups to send for guild ${guild.id} at this time.`);
        }
      } catch (error) {
        log.error(`Failed to process matchups for guild ${guild.id}`, error);
      }
    }
  });
};
