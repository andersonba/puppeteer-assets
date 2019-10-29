/* eslint-disable no-console */
const yamlJs = require('yamljs');
const { merge } = require('lodash');
const { env, envArray, envBool } = require('./utils');
const constants = require('../constants');

let settings = {
  path: env('METRICS_PATH', '/metrics'),
  metricName: env('METRIC_NAME', 'puppeteer_assets'),
  enableOnDemandQuery: envBool('METRICS_ON_DEMAND_QUERY', false),
  onDemandQueryCacheTTL: env('METRICS_ON_DEMAND_QUERY_CACHE_TTL', 300),
  labels: envArray('METRICS_LABELS', []),
  interval: env('METRICS_INTERVAL', 60 * 60 * 1000),
  defaults: {
    metrics: {
      file: envBool('METRICS_FILE_ENABLED', true),
      count: envBool('METRICS_COUNT_ENABLED', true),
      size: envBool('METRICS_SIZE_ENABLED', true),
      gzip: envBool('METRICS_GZIP_ENABLED', true),
      countByMimeType: envBool('METRICS_COUNT_BY_MIMETYPE_ENABLED', true),
      sizeByMimeType: envBool('METRICS_SIZE_BY_MIMETYPE_ENABLED', true),
      gzipByMimeType: envBool('METRICS_GZIP_BY_MIMETYPE_ENABLED', true),
    },
    mimeTypes: envArray('METRICS_MIMETYPES', constants.defaultMimeTypes),
  },
  configurations: [],
};

try {
  settings = merge(
    {},
    settings,
    yamlJs.load(env('CONFIG_PATH') || `${__dirname}/../config.yml`) || {},
  );
  console.info('> Using configuration file...');
} catch (e) {
  settings.enableOnDemandQuery = true;
  console.info('> No configuration file. On demand query enabled.');
}

module.exports = settings;
