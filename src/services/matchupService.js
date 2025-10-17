import { getGuildUserTeams } from './userService.js';
import { fetchSchedulesForLeagues } from './sportsApi.js';
import { log } from '../utils/logger.js';

const leagueDisplayNames = {
  NHL: '🏒 NHL',
  MLB: '⚾ MLB',
  NBA: '🏀 NBA',
  NFL: '🏈 NFL'
};

const groupTeamsByGame = (games, userTeams) => {
  const teamToUsers = new Map();
  for (const { user_id: userId, league, team_id: teamId } of userTeams) {
    const key = `${league}:${teamId.toLowerCase()}`;
    if (!teamToUsers.has(key)) {
      teamToUsers.set(key, new Set());
    }
    teamToUsers.get(key).add(userId);
  }

  const matches = [];
  for (const game of games) {
    const homeKey = `${game.league}:${game.homeTeam.toLowerCase()}`;
    const awayKey = `${game.league}:${game.awayTeam.toLowerCase()}`;
    const homeUsers = teamToUsers.get(homeKey);
    const awayUsers = teamToUsers.get(awayKey);
    if (homeUsers && awayUsers) {
      matches.push({ game, homeUsers: Array.from(homeUsers), awayUsers: Array.from(awayUsers) });
    }
  }
  return matches;
};

const buildMatchupMessage = ({ game, homeUsers, awayUsers }) => {
  const leaguePrefix = leagueDisplayNames[game.league] || game.league;
  const mention = (id) => `<@${id}>`;
  const userLine = `${homeUsers.map(mention).join(', ')} vs ${awayUsers.map(mention).join(', ')}`;
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short'
  });
  const startTime = timeFormatter.format(game.startTime);
  const broadcast = game.broadcast ? `Watch on ${game.broadcast}` : 'Check official listings for broadcast info';
  return {
    content: `${leaguePrefix} Matchup Alert!\n${game.homeTeam} vs ${game.awayTeam} — ${startTime}\n${userLine}\n${broadcast}`
  };
};

export const findAndFormatMatchups = async (guild, client) => {
  const userTeams = await getGuildUserTeams(guild.id);
  if (!userTeams.length) {
    log.info(`No user teams configured for guild ${guild.id}`);
    return [];
  }

  const leagues = guild.active_leagues?.length ? guild.active_leagues : ['NHL', 'MLB', 'NBA', 'NFL'];
  const games = await fetchSchedulesForLeagues(leagues, 1);
  if (!games.length) {
    log.info('No games found for leagues', leagues);
    return [];
  }

  const matches = groupTeamsByGame(games, userTeams);
  if (!matches.length) {
    log.info(`No matchups for guild ${guild.id}`);
    return [];
  }

  return matches.map((match) => buildMatchupMessage(match));
};
