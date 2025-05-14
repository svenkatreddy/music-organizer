#!/usr/bin/env node
const path = require('path');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const { organizeDirectory } = require('./utils/organizer');

yargs(hideBin(process.argv))
  .command('organize <input> <output>', 'Organize music files', (yargs) => {
    yargs
      .positional('input', { describe: 'Input folder', type: 'string' })
      .positional('output', { describe: 'Output folder', type: 'string' })
      .option('spotifyClientId', { describe: 'Spotify Client ID', type: 'string', demandOption: true })
      .option('spotifyClientSecret', { describe: 'Spotify Client Secret', type: 'string', demandOption: true })
      .option('dryRun', { describe: 'Simulate actions without changing files', type: 'boolean', default: false })
      .option('embedArt', { describe: 'Embed album art if available', type: 'boolean', default: false })
      .option('concurrency', { describe: 'Number of files to process in parallel', type: 'number', default: 4 })
      .option('rateLimit', { describe: 'API requests per second limit', type: 'number', default: 5 })
      .option('format', {
        describe: 'Output folder format using tokens like {artist}, {album}, {title}',
        type: 'string',
        default: '{artist}/{album}/{title}'
      });
  }, async (argv) => {
    await organizeDirectory(argv.input, argv.output, {
      spotifyClientId: argv.spotifyClientId,
      spotifyClientSecret: argv.spotifyClientSecret,
      dryRun: argv.dryRun,
      embedArt: argv.embedArt,
      concurrency: argv.concurrency,
      rateLimit: argv.rateLimit,
      format: argv.format
    });
  })
  .help().argv;
