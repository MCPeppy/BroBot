import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { loadCommands } from './utils/commandLoader.js';
import { log } from './utils/logger.js';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  throw new Error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be provided');
}

const rest = new REST({ version: '10' }).setToken(token);

const register = async () => {
  const commands = await loadCommands({ commands: new Map() });
  try {
    log.info('Refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    log.info('Successfully reloaded application (/) commands.');
  } catch (error) {
    log.error('Failed to register commands', error);
  }
};

register();
