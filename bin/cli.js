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
  .option('internalPattern', {
    alias: 'i',
    describe: 'Sets assets as internal scripts based on regex pattern',
  });

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

const { url, ...args } = argv;
const options = omit(args, ['help', 'version', '$0', '_']);
const loading = ora('Getting metrics...').start();

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
      loading.stop();

      const assetsTable = new Table({
        head: ['URL', 'Encoded Length', 'Length', 'MimeType', 'Type'],
        wordWrap: true,
      });

      Object.keys(assets).forEach((asset) => {
        const metrics = assets[asset];
        assetsTable.push([
          asset,
          filesize(metrics.encodedLength),
          filesize(metrics.length),
          metrics.mimeType,
          metrics.type,
        ]);
      });
      console.log(String(assetsTable));

      const summaryTable = new Table({
        head: ['Summary', 'Internal', 'External', 'Total'],
      });
      const [
        internalTotalLength,
        internalTotalEncodedLength,
      ] = getLengthsByType(assets, 'internal');
      const [
        externalTotalLength,
        externalTotalEncodedLength,
      ] = getLengthsByType(assets, 'external');
      summaryTable.push(['Count', internalCount, externalCount, count]);
      summaryTable.push([
        'Length',
        filesize(internalTotalLength),
        filesize(externalTotalLength),
        filesize(totalLength),
      ]);
      summaryTable.push([
        'Encoded Length',
        filesize(internalTotalEncodedLength),
        filesize(externalTotalEncodedLength),
        filesize(totalEncodedLength),
      ]);
      console.log(String(summaryTable));
    },
  )
  .catch((err) => {
    loading.stop();
    console.error('Error occurred', err);
  });
