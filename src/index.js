import { Client, GatewayIntentBits, Events } from 'discord.js';
import dotenv from 'dotenv';
import { loadCommands } from './utils/commandLoader.js';
import { initDatabase } from './services/database.js';
import { scheduleMatchupJob } from './jobs/matchupJob.js';
import { log } from './utils/logger.js';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
if (!token) {
  throw new Error('DISCORD_TOKEN must be provided');
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const bootstrap = async () => {
  await initDatabase();
  await loadCommands(client);

  client.once(Events.ClientReady, () => {
    log.info(`Logged in as ${client.user.tag}`);
    scheduleMatchupJob(client);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    await command.execute(interaction);
  });

  await client.login(token);
};

bootstrap().catch((error) => {
  log.error('Failed to bootstrap SmackTalk bot', error);
  process.exit(1);
});
