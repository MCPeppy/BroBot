import axios from 'axios';
import dotenv from 'dotenv';
import { log } from '../utils/logger.js';

dotenv.config();

const SUPPORTED_LEAGUES = ['NHL', 'MLB', 'NBA', 'NFL'];

const LEAGUE_ENDPOINTS = {
  NHL: '/1/eventsday.php?l=NHL&d=',
  MLB: '/1/eventsday.php?l=MLB&d=',
  NBA: '/1/eventsday.php?l=NBA&d=',
  NFL: '/1/eventsday.php?l=NFL&d='
};

const formatDate = (date) => date.toISOString().split('T')[0];

const normalizeGame = (league, game) => {
  if (!game) return null;
  const startTime = game.strTimestamp ? new Date(game.strTimestamp) : new Date(`${game.dateEvent}T${game.strTime || '00:00:00'}Z`);
  return {
    id: game.idEvent,
    league,
    homeTeam: game.strHomeTeam,
    awayTeam: game.strAwayTeam,
    startTime,
    broadcast: game.strTVStation || game.strChannel || null,
    event: game
  };
};

export const fetchLeagueSchedule = async (league, date) => {
  if (!SUPPORTED_LEAGUES.includes(league)) {
    throw new Error(`Unsupported league: ${league}`);
  }
  const baseUrl = process.env.SPORTS_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('SPORTS_API_BASE_URL not configured');
  }

  const path = LEAGUE_ENDPOINTS[league];
  const formattedDate = formatDate(date);
  const url = `${baseUrl}${path}${formattedDate}`;
  const apiKey = process.env.SPORTS_API_KEY;

  try {
    const { data } = await axios.get(url, {
      params: apiKey ? { apikey: apiKey } : undefined
    });
    const events = data.events || [];
    return events
      .map((event) => normalizeGame(league, event))
      .filter(Boolean);
  } catch (error) {
    log.error('Failed to fetch schedule', { league, error: error.message });
    return [];
  }
};

export const fetchSchedulesForLeagues = async (leagues, daysAhead = 1) => {
  const today = new Date();
  const dates = [today];
  if (daysAhead >= 1) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    dates.push(tomorrow);
  }

  const results = [];
  for (const league of leagues) {
    for (const date of dates) {
      const games = await fetchLeagueSchedule(league, date);
      results.push(...games);
    }
  }
  return results;
};
