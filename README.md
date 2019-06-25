# Puppeteer Assets [![npm version](https://badge.fury.io/js/puppeteer-assets.svg)](https://badge.fury.io/js/puppeteer-assets) [![Build Status](https://travis-ci.org/andersonba/puppeteer-assets.svg?branch=master)](https://travis-ci.org/andersonba/puppeteer-assets)
> Gets assets metrics using [Puppeteer](https://github.com/googlechrome/puppeteer).

Want to know which scripts are loaded in your page? This module allows you to extract and audit the metrics.

![CLI-output](resources/cli.png)

## Set up
```bash
npm install puppeteer-assets
```

## Usage
Using CLI
```bash
puppeteer-assets www.google.com
```

Using on Node.js
```javascript
const assetsMetrics = require('puppeteer-assets');

const metrics = await assetsMetrics('https://www.google.com');
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
* `url` - **Required.** Page URL.
* `options.internalPattern` - String/Regex. Identify scripts as Internal based on RegExp *(Default: null)*
* `options.mimeTypes` - Array of String/RegExp. File types to be matched *(Default: 'javascript')*
