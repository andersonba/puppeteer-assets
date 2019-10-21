#!/usr/bin/env node
/* eslint-disable no-console */
const { omit } = require('lodash');
const Table = require('cli-table');
const filesize = require('filesize');
const yargs = require('yargs');
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
  .option('internalPattern', {
    alias: 'i',
    describe: 'Sets assets as internal scripts based on regex pattern',
  });

const { url, ...args } = argv;
const options = omit(args, ['help', 'version', '$0', '_']);

console.log('Getting metrics...');

function getLengthsByType(assets, type) {
  let len = 0;
  let enc = 0;
  Object.keys(assets).forEach((k) => {
    if (type === assets[k].type) {
      len += assets[k].length;
      enc += assets[k].encodedLength;
    }
  });
  return [len, enc];
}

run(url, options)
  .then(
    ({
      assets,
      totalEncodedLength,
      totalLength,
      count,
      internalCount,
      externalCount,
    }) => {
      const table = new Table({
        head: ['Asset URL', 'Encoded Length', 'Length', 'MimeType', 'Type'],
        colWidths: [70, 16, 16, 20, 10],
      });

      Object.keys(assets).forEach((asset) => {
        const metrics = assets[asset];
        table.push([
          asset,
          filesize(metrics.encodedLength),
          filesize(metrics.length),
          metrics.mimeType,
          metrics.type,
        ]);
      });
      console.log(table.toString());

      const table2 = new Table({
        head: ['', 'Internal', 'External', 'Total'],
      });
      const [
        internalTotalLength,
        internalTotalEncodedLength,
      ] = getLengthsByType(assets, 'internal');
      const [
        externalTotalLength,
        externalTotalEncodedLength,
      ] = getLengthsByType(assets, 'external');
      table2.push(['Count', internalCount, externalCount, count]);
      table2.push([
        'Length',
        filesize(internalTotalLength),
        filesize(externalTotalLength),
        filesize(totalLength),
      ]);
      table2.push([
        'Encoded Length',
        filesize(internalTotalEncodedLength),
        filesize(externalTotalEncodedLength),
        filesize(totalEncodedLength),
      ]);
      console.log(table2.toString());
    },
  )
  .catch((err) => {
    console.error('Error occurred', err);
  });
