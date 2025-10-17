import { Collection } from 'discord.js';
import { smackCommand } from '../commands/smack.js';

export const loadCommands = async (client) => {
  const commands = [smackCommand];
  if (client) {
    if (client.commands && typeof client.commands.set === 'function') {
      client.commands.clear();
      for (const command of commands) {
        client.commands.set(command.data.name, command);
      }
    } else {
      const collection = new Collection();
      for (const command of commands) {
        collection.set(command.data.name, command);
      }
      client.commands = collection;
    }
  }
  return commands.map((command) => command.data.toJSON());
};
