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
    ? fromPairs(arr.map((l) => l.split(':'))) || {}
    : {};
}

function iterateToGauge(metrics, field, gauge, page) {
  Object.entries(metrics[field]).forEach(([type, data]) => {
    if (type === 'total') return;
    Object.entries(data).forEach(([mimeType, value]) => {
      if (mimeType === 'total') {
        gauge.set({ page, type }, value);
      }
    });
  });
}

function iterateToGaugeByMimeType(metrics, field, gauge, page) {
  Object.entries(metrics[field]).forEach(([type, data]) => {
    if (type === 'total') return;
    Object.entries(data).forEach(([mimeType, value]) => {
      if (mimeType === 'total') return;
      gauge.set({ page, type, mime_type: mimeType }, value);
    });
  });
}

app.get(
  '/metrics',
  (() => {
    const metricName = process.env.ASSETS_METRIC_NAME || 'puppeteer_assets';

    new promClient.Gauge({
      name: 'up',
      help: '1 = up, 0 = not up',
    }).set(1);

    const gaugeFile = new promClient.Gauge({
      name: `${metricName}_file`,
      help: 'historically found assets on scrap',
      labelNames: ['page', 'type', 'mime_type', 'url'],
    });

    const gaugeCount = new promClient.Gauge({
      name: `${metricName}_count`,
      help: 'count of internal assets',
      labelNames: ['page', 'type'],
    });

    const gaugeSize = new promClient.Gauge({
      name: `${metricName}_size`,
      help: 'real size of assets',
      labelNames: ['page', 'type'],
    });

    const gaugeEncodedSize = new promClient.Gauge({
      name: `${metricName}_encoded_size`,
      help: 'encoded (gzip) size of assets',
      labelNames: ['page', 'type'],
    });

    const gaugeCountByMimeType = new promClient.Gauge({
      name: `${metricName}_count_by_mime_type`,
      help: 'count of internal assets by mime type',
      labelNames: ['page', 'type', 'mime_type'],
    });

    const gaugeSizeByMimeType = new promClient.Gauge({
      name: `${metricName}_size_by_mime_type`,
      help: 'real size of assets by mime type',
      labelNames: ['page', 'type', 'mime_type'],
    });

    const gaugeEncodedSizeByMimeType = new promClient.Gauge({
      name: `${metricName}_encoded_size_by_mime_type`,
      help: 'encoded (gzip) size of assets by mime type',
      labelNames: ['page', 'type', 'mime_type'],
    });

    const configureMetrics = async (page, options) => {
      let metrics = cache.get(page);

      if (!metrics) {
        if (!running) {
          running = true;

          try {
            metrics = await run(page, options);
          } catch (e) {
            console.error(e);
          }

          running = false;
          cache.set(page, metrics);
        } else {
          return;
        }
      }

      const ts = Date.now();
      Object.entries(metrics.assets).forEach(([url, data]) => {
        const { type, mimeType } = data;
        gaugeFile.set(
          {
            page,
            url,
            type,
            mime_type: mimeType,
          },
          ts,
        );
      });

      // default
      iterateToGauge(metrics, 'count', gaugeCount, page);
      iterateToGauge(metrics, 'size', gaugeSize, page);
      iterateToGauge(metrics, 'encodedSize', gaugeEncodedSize, page);

      // by mime type
      iterateToGaugeByMimeType(metrics, 'count', gaugeCountByMimeType, page);
      iterateToGaugeByMimeType(metrics, 'size', gaugeSizeByMimeType, page);
      iterateToGaugeByMimeType(
        metrics,
        'encodedSize',
        gaugeEncodedSizeByMimeType,
        page,
      );
    };

    async function middleware(req, res, next) {
      const { url, labels = [], ...qsOptions } = req.query;
      const page = url || config.url;
      const customLabels = assign(parseLabelsParam(labels), config.labels);
      const options = { ...qsOptions, ...config.options };

      console.info(
        'GET',
        page,
        options,
        cache.get(page) ? '[cached]' : '[not-cached]',
      );

      if (!page) {
        res.status(400).send('No Page URL defined');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/plain' });

      promClient.register.setDefaultLabels(customLabels);

      try {
        await configureMetrics(page, options);
      } catch (e) {
        console.error(e);
      }

      res.end(promClient.register.metrics());
      next();
    }

    return middleware;
  })(),
);

const server = app.listen(process.env.PORT || 3000, () => {
  console.log('Server listening on port %d', server.address().port);

  if (Object.keys(config).length) {
    console.log('Configuration file:', config);
  }
});
