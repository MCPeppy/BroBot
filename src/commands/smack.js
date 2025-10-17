import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} from 'discord.js';
import {
  ensureGuild,
  ensureUser,
  setUserTeam,
  getUserTeams,
  clearUserTeams
} from '../services/userService.js';
import { updateGuildSettings, getGuildSettings } from '../services/guildService.js';
import { findAndFormatMatchups } from '../services/matchupService.js';

const SUPPORTED_LEAGUES = ['NHL', 'MLB', 'NBA', 'NFL'];

const normalizeLeague = (league) => league.toUpperCase();

const buildLeagueChoices = () =>
  SUPPORTED_LEAGUES.map((league) => ({ name: league, value: league }));

const requireManageGuild = (interaction) => {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    throw new Error('You need the Manage Server permission to use this command.');
  }
};

export const smackCommand = {
  data: new SlashCommandBuilder()
    .setName('smack')
    .setDescription('SmackTalk sports matchup assistant')
    .addSubcommandGroup((group) =>
      group
        .setName('profile')
        .setDescription('Manage your favorite teams')
        .addSubcommand((sub) =>
          sub
            .setName('set')
            .setDescription('Set your favorite team for a league')
            .addStringOption((option) =>
              option
                .setName('league')
                .setDescription('League to configure')
                .setRequired(true)
                .addChoices(...buildLeagueChoices())
            )
            .addStringOption((option) =>
              option
                .setName('team')
                .setDescription('Team name or ID')
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('view')
            .setDescription('View your saved teams')
        )
        .addSubcommand((sub) =>
          sub
            .setName('clear')
            .setDescription('Clear saved teams')
            .addStringOption((option) =>
              option
                .setName('league')
                .setDescription('Optional league to clear')
                .addChoices(...buildLeagueChoices())
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Configure alert channel and time')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel to send matchup alerts to')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addStringOption((option) =>
          option
            .setName('time')
            .setDescription('Daily alert time (24h HH:MM) in server timezone')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('settings')
        .setDescription('Update active leagues for this server')
        .addStringOption((option) =>
          option
            .setName('leagues')
            .setDescription('Comma-separated list, e.g. NHL,NBA,NFL')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('test')
        .setDescription('Send a sample matchup alert to the configured channel')
    ),
  async execute(interaction) {
    try {
      await ensureGuild(interaction.guild);
      await ensureUser(interaction.user);
      const subcommandGroup = interaction.options.getSubcommandGroup(false);
      const subcommand = interaction.options.getSubcommand();

      if (subcommandGroup === 'profile') {
        await handleProfile(interaction, subcommand);
      } else if (subcommand === 'setup') {
        await handleSetup(interaction);
      } else if (subcommand === 'settings') {
        await handleSettings(interaction);
      } else if (subcommand === 'test') {
        await handleTest(interaction);
      } else {
        await interaction.reply({ content: 'Unknown command', ephemeral: true });
      }
    } catch (error) {
      const message = error.message || 'Something went wrong.';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: `⚠️ ${message}`, ephemeral: true });
      } else {
        await interaction.reply({ content: `⚠️ ${message}`, ephemeral: true });
      }
    }
  }
};

const handleProfile = async (interaction, subcommand) => {
  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  if (subcommand === 'set') {
    const league = normalizeLeague(interaction.options.getString('league', true));
    const team = interaction.options.getString('team', true);
    await setUserTeam({ userId, guildId, league, teamId: team });
    await interaction.reply({
      content: `✅ Saved ${team} for ${league}. We'll keep an eye out for rivalries!`,
      ephemeral: true
    });
  } else if (subcommand === 'view') {
    const teams = await getUserTeams({ userId, guildId });
    if (!teams.length) {
      await interaction.reply({ content: 'You have not saved any teams yet.', ephemeral: true });
      return;
    }
    const description = teams
      .map((team) => `• ${team.league}: ${team.team_id}`)
      .join('\n');
    await interaction.reply({
      content: `Here are your saved teams:\n${description}`,
      ephemeral: true
    });
  } else if (subcommand === 'clear') {
    const league = interaction.options.getString('league');
    await clearUserTeams({ userId, guildId, league: league ? normalizeLeague(league) : undefined });
    await interaction.reply({
      content: league ? `Removed your ${league} team.` : 'Cleared all saved teams.',
      ephemeral: true
    });
  }
};

const handleSetup = async (interaction) => {
  requireManageGuild(interaction);
  const channel = interaction.options.getChannel('channel', true);
  const time = interaction.options.getString('time', true);
  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error('Time must be formatted as HH:MM (24-hour).');
  }

  await updateGuildSettings({
    guildId: interaction.guildId,
    alertChannelId: channel.id,
    alertTime: time
  });

  await interaction.reply({
    content: `Alerts will post in ${channel} every day at ${time}.`,
    ephemeral: true
  });
};

const handleSettings = async (interaction) => {
  requireManageGuild(interaction);
  const leaguesInput = interaction.options.getString('leagues', true);
  const leagues = leaguesInput
    .split(',')
    .map((league) => normalizeLeague(league.trim()))
    .filter((league) => SUPPORTED_LEAGUES.includes(league));

  if (!leagues.length) {
    throw new Error(`Please include at least one supported league (${SUPPORTED_LEAGUES.join(', ')}).`);
  }

  await updateGuildSettings({ guildId: interaction.guildId, activeLeagues: leagues });
  await interaction.reply({
    content: `Active leagues updated: ${leagues.join(', ')}`,
    ephemeral: true
  });
};

const handleTest = async (interaction) => {
  requireManageGuild(interaction);
  const guildSettings = await getGuildSettings(interaction.guildId);
  if (!guildSettings?.alert_channel_id) {
    throw new Error('Please run /smack setup before testing notifications.');
  }
  const channel = interaction.guild.channels.cache.get(String(guildSettings.alert_channel_id));
  if (!channel || !channel.isTextBased()) {
    throw new Error('Configured alert channel is not accessible.');
  }
  const messages = await findAndFormatMatchups(guildSettings, interaction.client);
  if (messages.length) {
    for (const message of messages) {
      await channel.send(message);
    }
    await interaction.reply({ content: `Sent ${messages.length} matchup alert(s) to ${channel}.`, ephemeral: true });
  } else {
    await channel.send('📣 SmackTalk test — no rival matchups found right now, but stay tuned!');
    await interaction.reply({ content: `Test message posted in ${channel}.`, ephemeral: true });
  }
};
