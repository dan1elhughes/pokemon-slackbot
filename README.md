# Pokébot

[![CircleCI](https://circleci.com/gh/dan1elhughes/pokemon-slackbot.svg?style=svg)](https://circleci.com/gh/dan1elhughes/pokemon-slackbot)

## Currently inactive

As this uses the [Pokevision API](https://pokevision.com/), it will not work until that API comes back online. PRs replacing the API for another much appreciated.

## Usage

Clone the repository and push it to Heroku. Develop locally with `node server.js`.

## Environment variables

### Required

- `LAT` (latitude)
- `LNG` (longitude)

### Optional

- `CATCH_THRESHOLD` defaults to 75 (max distance in metres to trigger notification)
- `INTERVAL_MS` defaults to 60000 (milliseconds between checks)

## Adapters

### Interface

Adapters implement the following methods:

- `debug(message)` sends information messages.
- `send(message)` sends Pokémon notifications.

Adapters may also implement the following methods:

- `start` returns a promise, resolved when the adapter is ready to accept messages or rejected if the adapter fails.
- `shouldCheck(date)` returns true/false for if the scanner should run.

### Included adapters

To use an adapter, set the `ADAPTER` environment variable to match.

- `console` (default)
- `slack`
