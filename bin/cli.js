#!/usr/bin/env node
/* eslint-disable no-console */
const { omit } = require('lodash');
const Table = require('cli-table3');
const filesize = require('filesize');
const yargs = require('yargs');
const ora = require('ora');
const run = require('..');

require('dotenv').config();

const { argv } = yargs
  .env('ASSETS')
  .usage('$0 <url>', 'Run assets metrics', (y) => y.positional('url', {
    describe: 'Website URL',
    type: 'string',
  }))
  .array('mimeTypes')
  .option('mimeTypes', {
    alias: 't',
    describe: 'Filter assets based on mime type',
    default: ['javascript'],
  })
  .array('internalPatterns')
  .option('internalPatterns', {
    alias: 'i',
    describe: 'Set assets as internal assets based on regex pattern',
  })
  .array('ignorePatterns')
  .option('ignorePatterns', {
    alias: 'ignore',
    describe: 'Ignore assets based on regex pattern',
  })
  .option('cookies', {
    array: true,
    alias: 'c',
    describe: 'Set cookies before open page',
    type: 'string',
  });

const { url, ...args } = argv;
const options = omit(args, ['help', 'version', '$0', '_']);
const loading = ora('Getting metrics...').start();

run(url, options)
  .then(
    ({
      assets,
      count,
      size,
      gzip,
    }) => {
      loading.stop();

      const assetsTable = new Table({
        head: ['Type', 'URL', 'Size', 'Gzip', 'MimeType', 'Raw MimeType'],
        wordWrap: true,
      });

      Object.keys(assets).forEach((asset) => {
        const metrics = assets[asset];
        assetsTable.push([
          metrics.type,
          asset,
          filesize(metrics.size),
          filesize(metrics.gzip),
          metrics.mimeType,
          metrics.rawMimeType,
        ]);
      });
      console.log(String(assetsTable));

      const summaryTable = new Table({
        head: ['Summary', 'Internal', 'External', 'Total'],
      });
      summaryTable.push(['Count', count.internal.total, count.external.total, count.total]);
      summaryTable.push([
        'Size',
        filesize(size.internal.total),
        filesize(size.external.total),
        filesize(size.total),
      ]);
      summaryTable.push([
        'Gzip',
        filesize(gzip.internal.total),
        filesize(gzip.external.total),
        filesize(gzip.total),
      ]);
      console.log(String(summaryTable));
    },
  )
  .catch((err) => {
    loading.stop();
    console.error('Error occurred', err);
  });
