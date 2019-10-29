/* eslint-disable no-console */
const express = require('express');
const bodyParser = require('body-parser');
const promClient = require('prom-client');
const { get } = require('lodash');
const Store = require('./store');
const Settings = require('./settings');
const constants = require('../constants');
const getMetrics = require('..');
const { env, parseLabelsParam, ensureArrayParam } = require('./utils');

const store = new Store({
  cacheTTL: Settings.onDemandQueryCacheTTL,
});
const app = express();

app.use(bodyParser.json());

function conf(key, config) {
  return get(config, key, get(Settings.defaults, key));
}

function iterateToGauge(metrics, field, gauge, config) {
  const { url: page, labels } = config;
  Object.entries(metrics[field]).forEach(([type, data]) => {
    if (type === 'total') return;
    Object.entries(data).forEach(([mimeType, value]) => {
      if (mimeType === 'total') {
        gauge.set({ page, type, ...labels }, value);
      }
    });
  });
}

function iterateToGaugeByMimeType(metrics, field, gauge, config) {
  const { url: page, labels } = config;
  const mimeTypes = conf('mimeTypes', config);
  Object.entries(metrics[field]).forEach(([type, data]) => {
    if (type === 'total') return;
    mimeTypes.forEach((mimeType) => {
      gauge.set({
        page, type, mime_type: mimeType, ...labels,
      }, data[mimeType] || 0);
    });
  });
}

function stripInvalidLabels(labelKeys, config) {
  const labels = labelKeys.reduce((acc, key) => {
    const value = conf('labels', config)[key];
    acc[key] = value || null;
    return acc;
  }, {});
  return { ...config, labels };
}

function registerMetrics(metrics, config, {
  gaugeFile,
  gaugeCount,
  gaugeSize,
  gaugeGzip,
  gaugeCountByMimeType,
  gaugeSizeByMimeType,
  gaugeGzipByMimeType,
}) {
  const labels = conf('labels', config);

  promClient.register.setDefaultLabels(labels);

  if (conf('metrics.file', config)) {
    // file metrics
    const ts = Date.now();
    Object.entries(metrics.assets).forEach(([url, data]) => {
      const {
        type, mimeType, size, gzip,
      } = data;
      gaugeFile.set(
        {
          page: config.url,
          url,
          type,
          size,
          gzip,
          mime_type: mimeType,
        },
        ts,
      );
    });
  }

  // default
  if (conf('metrics.count', config)) {
    iterateToGauge(metrics, 'count', gaugeCount, config);
  }
  if (conf('metrics.size', config)) {
    iterateToGauge(metrics, 'size', gaugeSize, config);
  }
  if (conf('metrics.gzip', config)) {
    iterateToGauge(metrics, 'gzip', gaugeGzip, config);
  }

  // by mime type
  if (conf('metrics.countByMimeType', config)) {
    iterateToGaugeByMimeType(metrics, 'count', gaugeCountByMimeType, config);
  }
  if (conf('metrics.sizeByMimeType', config)) {
    iterateToGaugeByMimeType(metrics, 'size', gaugeSizeByMimeType, config);
  }
  if (conf('metrics.gzipByMimeType', config)) {
    iterateToGaugeByMimeType(metrics, 'gzip', gaugeGzipByMimeType, config);
  }
}

function setupMetrics(configurations, overrideSettings = {}) {
  const { metricName, labels: labelKeys } = { ...Settings, ...overrideSettings };

  promClient.register.clear();

  const gaugeUp = new promClient.Gauge({
    name: `${metricName}_up`,
    help: '1 = up, 0 = not up',
    labelNames: ['page', ...labelKeys],
  });

  const gaugeFile = conf('metrics.file')
    ? new promClient.Gauge({
      name: `${metricName}_file`,
      help: 'historically found assets on scrap',
      labelNames: ['page', 'type', 'mime_type', 'size', 'gzip', 'url', ...labelKeys],
    })
    : null;

  const gaugeCount = conf('metrics.count')
    ? new promClient.Gauge({
      name: `${metricName}_count`,
      help: 'count of internal assets',
      labelNames: ['page', 'type', ...labelKeys],
    })
    : null;

  const gaugeSize = conf('metrics.size')
    ? new promClient.Gauge({
      name: `${metricName}_size`,
      help: 'real size of assets',
      labelNames: ['page', 'type', ...labelKeys],
    })
    : null;

  const gaugeGzip = conf('metrics.gzip')
    ? new promClient.Gauge({
      name: `${metricName}_gzip`,
      help: 'encoded (gzip) size of assets',
      labelNames: ['page', 'type', ...labelKeys],
    })
    : null;

  const gaugeCountByMimeType = conf('metrics.countByMimeType')
    ? new promClient.Gauge({
      name: `${metricName}_count_by_mime_type`,
      help: 'count of internal assets by mime type',
      labelNames: ['page', 'type', 'mime_type', ...labelKeys],
    })
    : null;

  const gaugeSizeByMimeType = conf('metrics.sizeByMimeType')
    ? new promClient.Gauge({
      name: `${metricName}_size_by_mime_type`,
      help: 'real size of assets by mime type',
      labelNames: ['page', 'type', 'mime_type', ...labelKeys],
    })
    : null;

  const gaugeGzipByMimeType = conf('metrics.gzipByMimeType')
    ? new promClient.Gauge({
      name: `${metricName}_gzip_by_mime_type`,
      help: 'encoded (gzip) size of assets by mime type',
      labelNames: ['page', 'type', 'mime_type', ...labelKeys],
    })
    : null;

  configurations.forEach((rawConfig) => {
    const config = stripInvalidLabels(labelKeys, rawConfig);
    const metrics = store.get(config.url);

    gaugeUp.set({
      page: config.url,
      ...conf('labels', config),
    }, metrics ? 1 : 0);

    if (metrics) {
      registerMetrics(metrics, config, {
        gaugeFile,
        gaugeCount,
        gaugeSize,
        gaugeGzip,
        gaugeCountByMimeType,
        gaugeSizeByMimeType,
        gaugeGzipByMimeType,
      });
      return true;
    }
    return false;
  });
}

function configureTimer() {
  if (!Settings.configurations.length) return;

  async function execute() {
    store.busy = true;
    await Promise.all(
      Settings.configurations.map(async (config) => {
        const metrics = await getMetrics(config.url, config);
        if (metrics) store.set(config.url, metrics);
      }),
    );
    store.busy = false;
  }

  execute();

  setInterval(async () => {
    console.info('> timer: scraping pages...');
    await execute();
    console.info('> timer: done...');
  }, Settings.interval);
}

function assertRouting(req) {
  if (req.query.url) {
    if (!Settings.enableOnDemandQuery) {
      throw new Error('On Demand is disabled');
    }
  } else if (Settings.enableOnDemandQuery && !Settings.configurations.length) {
    throw new Error('No URL query argument');
  } else if (!Settings.configurations.length) {
    throw new Error('No configurations');
  }
}

app.get(Settings.path, async (req, res, next) => {
  try {
    assertRouting(req);
  } catch (err) {
    res.status(400).send(err.message);
    return;
  }

  try {
    // on demand query
    if (req.query.url) {
      const cached = store.get(req.query.url) && !req.query.nocache;
      console.log('> Requesting on-demand:', req.query.url, cached ? '[cache]' : '');

      if (!cached && store.busy) throw new Error('Ops.. Busy service!');

      constants.arrayParams.forEach((p) => ensureArrayParam(req.query, p));

      const config = { ...Settings.defaults, ...req.query };
      config.url = req.query.url;
      config.labels = parseLabelsParam(req.query.labels || []);

      if (!cached) {
        const metrics = await getMetrics(config.url, config);
        store.set(config.url, metrics, true);
      }

      const overrideSettings = { labels: Object.keys(config.labels) };
      setupMetrics([config], overrideSettings);
    } else {
      console.log('> Requesting metrics');
      setupMetrics(Settings.configurations);
    }
  } catch (err) {
    res.status(500).send(`ERROR: ${err.message}`);
    throw err;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(promClient.register.metrics());
  next();
});

app.get('/check', (_, res) => res.send('OK'));

app.delete('/cache', (_, res) => {
  store.clear();
  res.send('Cache cleared!');
});

const server = app.listen(env('PORT', 3000), () => {
  configureTimer();
  console.log('Server listening on port %d', server.address().port);
});
