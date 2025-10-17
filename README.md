# SmackTalk — Discord Sports Matchup Bot

SmackTalk is a Discord bot that keeps servers ready for friendly rivalries by alerting members when their favorite NHL, MLB, NBA, or NFL teams play each other.

## Features

- **User profiles** — `/smack profile set` lets members pick their teams per league, with quick `/smack profile view` and `/smack profile clear` management.
- **Automated matchup alerts** — A scheduled job checks daily schedules and posts to a configured channel whenever two members have teams facing off.
- **Admin controls** — `/smack setup`, `/smack settings`, and `/smack test` allow moderators to configure alert channels, select active leagues, and validate the integration.
- **Sports API integration** — Pluggable schedule fetching (defaults to TheSportsDB endpoints) with placeholders for broadcast details.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Discord bot token and application client ID
- Sports data API key (optional depending on provider)

### Installation

```bash
npm install
```

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `DISCORD_TOKEN` | Bot token from the Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Application client ID for registering commands |
| `DATABASE_URL` | PostgreSQL connection string |
| `SPORTS_API_KEY` | API key for the sports data provider (if required) |
| `SPORTS_API_BASE_URL` | Base URL for the API (defaults to TheSportsDB JSON API) |

### Database Setup

The bot automatically ensures the required tables exist on startup. Provide a database with permissions to create tables.

### Register Slash Commands

Once environment variables are set, register the slash commands globally:

```bash
npm run register-commands
```

### Run the Bot

```bash
npm start
```

The bot will log in, synchronize slash commands locally, and schedule hourly matchup sweeps that respect each server's preferred alert time.

## Project Structure

```
src/
  commands/        # Slash command definitions
  jobs/            # Scheduled cron jobs
  services/        # Database and API integrations
  utils/           # Shared helpers
```

## Roadmap

- Phase 2: richer broadcast formatting, optional DM alerts, and logo support.
- Phase 3: expanded leagues, custom timing, and role badge automation.

## License

MIT
