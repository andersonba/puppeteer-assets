# Puppeteer Assets [![npm version](https://badge.fury.io/js/puppeteer-assets.svg)](https://badge.fury.io/js/puppeteer-assets) [![Build Status](https://travis-ci.org/andersonba/puppeteer-assets.svg?branch=master)](https://travis-ci.org/andersonba/puppeteer-assets)

> Gets assets metrics using [Puppeteer](https://github.com/googlechrome/puppeteer).

Want to know which scripts are loaded in your page? This module allows you to extract and audit the metrics.

![Gif CLI](resources/cli.gif)

## Set up

```bash
yarn add puppeteer-assets
```

## Usage

Using CLI

```bash
puppeteer-assets www.google.com
```

Using on Node.js

```javascript
const assetsMetrics = require('puppeteer-assets');
const metrics = await assetsMetrics('https://www.andersonba.com');

// Output
{
  assets: {
    'https://www.andersonba.com/scripts/main.js': {
      mimeType: 'application/javascript',
      type: 'internal',
      encodedSize: 1621,
      size: 1621
    },
    'https://www.andersonba.com/scripts/vendor.js': {
      mimeType: 'application/javascript',
      type: 'internal',
      encodedSize: 213438,
      size: 213438
    },
    'https://www.google-analytics.com/analytics.js': {
      mimeType: 'text/javascript',
      type: 'external',
      encodedSize: 17821,
      size: 44470
    },
    'https://www.google-analytics.com/gtm/js?id=GTM-W7LMQWK&cid=233171157.1571718357': {
      mimeType: 'application/javascript',
      type: 'external',
      encodedSize: 0,
      size: 63611
    }
  },
  count: {
    internal: { total: 2, 'application/javascript': 2 },
    external: { total: 2, 'text/javascript': 1, 'application/javascript': 1 },
    total: 4
  },
  size: {
    internal: { total: 215059, 'application/javascript': 215059 },
    external: {
      total: 108081,
      'text/javascript': 44470,
      'application/javascript': 63611
    },
    total: 323140
  },
  encodedSize: {
    internal: { total: 215059, 'application/javascript': 215059 },
    external: {
      total: 17821,
      'text/javascript': 17821,
      'application/javascript': 0
    },
    total: 232880
  }
}

```

## Prometheus

Exports assets metrics via HTTP for Prometheus consumption.

![Grafana](resources/grafana.png)

Use [docker image](https://hub.docker.com/r/andersonba/prometheus-assets/):

```bash
docker run --name=prometheus-assets -d -p 3000:3000 andersonba/prometheus-assets
```

Now, in your Prometheus configuration ([/etc/prometheus/prometheus.yml](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)), add a new target.

You can monitor multiple URLs passing `params` each scrape config. [See example](prometheus/prometheus.yml#L12-L37)

If you prefer use a configuration file, create a [config.yml](prometheus/config.example.yml) file. Then, run the container defining
the volume:

```bash
docker run --name=prometheus-assets -v /tmp/config.yml:/app/prometheus/ -d -p 3000:3000 andersonba/prometheus-assets
```

## Reference

#### `assetsMetrics(url, options)`

Execute the command

##### Parameters

- `url` - **Required.** Page URL.
- `options.internalPattern` - String/Regex. Identify scripts as Internal based on RegExp _(Default: null)_
- `options.mimeTypes` - Array of String/RegExp. File types to be matched _(Default: 'javascript')_
