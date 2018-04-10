/* eslint-disable no-console */
const express = require('express');
const bodyParser = require('body-parser');
const Cache = require('ttl-cache');
const promClient = require('prom-client');
const YAML = require('yamljs');
const { assign, fromPairs, isArray } = require('lodash');
const run = require('..');

let config = {};
try {
  config = YAML.load(`${__dirname}/config.yml`) || {};
  console.info('Using configuration file');
} catch (e) {
  // pass
}

const app = express();
app.use(bodyParser.json());

const cache = new Cache({
  ttl: process.env.CACHE_TTL || 300, // seconds
  interval: process.env.CACHE_INTERVAL || 60, // seconds,
});

let running = false;

function parseLabelsParam(arr) {
  return isArray(arr) && arr.length
    ? fromPairs(arr.map(l => l.split(':'))) || {}
    : {};
}

app.get('/metrics', (() => {
  const metricName = process.env.ASSETS_METRIC_NAME || 'puppeteer_assets';

  new promClient.Gauge({
    name: 'up',
    help: '1 = up, 0 = not up',
  }).set(1);

  const gaugeLength = new promClient.Gauge({
    name: `${metricName}_length`,
    help: 'real size of assets',
    labelNames: ['url', 'mime_type', 'type', 'page'],
  });

  const gaugeEncodeLength = new promClient.Gauge({
    name: `${metricName}_encoded_length`,
    help: 'encoded (gzip) size of assets',
    labelNames: ['url', 'mime_type', 'type', 'page'],
  });

  const gaugeInternalCount = new promClient.Gauge({
    name: `${metricName}_internal_count`,
    help: 'count of internal assets',
    labelNames: ['page'],
  });

  const gaugeExternalCount = new promClient.Gauge({
    name: `${metricName}_external_count`,
    help: 'count of external assets',
    labelNames: ['page'],
  });

  const configureMetric = async (pageUrl, options) => {
    let metrics = cache.get(pageUrl);

    if (!metrics) {
      if (!running) {
        running = true;

        try {
          metrics = await run(pageUrl, options);
        } catch (e) {
          console.error(e);
        }

        running = false;
        cache.set(pageUrl, metrics);
      } else {
        return;
      }
    }

    Object.keys(metrics.assets).forEach((url) => {
      const asset = metrics.assets[url];
      const args = {
        url,
        mime_type: asset.mimeType,
        type: asset.type,
        page: pageUrl,
      };
      gaugeLength.set(args, asset.length);
      gaugeEncodeLength.set(args, asset.encodedLength);
    });

    gaugeInternalCount.set({ page: pageUrl }, metrics.internalCount);
    gaugeExternalCount.set({ page: pageUrl }, metrics.externalCount);
  };

  async function middleware(req, res, next) {
    const { url, labels = [], ...qsOptions } = req.query;
    const pageUrl = url || config.url;
    const customLabels = assign(parseLabelsParam(labels), config.labels);
    const options = { ...qsOptions, ...config.options };

    console.info(
      'GET',
      pageUrl,
      options,
      cache.get(pageUrl) ? '[ready]' : '[pending]',
    );

    if (!pageUrl) {
      res.status(400).send('No Page URL defined');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });

    promClient.register.setDefaultLabels(customLabels);

    try {
      await configureMetric(pageUrl, options);
    } catch (e) {
      console.error(e);
    }

    res.end(promClient.register.metrics());
    next();
  }

  return middleware;
})());

const server = app.listen(process.env.PORT || 3000, () => {
  console.log('Server listening on port %d', server.address().port);

  if (Object.keys(config).length) {
    console.log('Configuration file:');
    console.log(config);
  }
});
