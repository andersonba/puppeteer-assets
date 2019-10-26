# Prometheus Assets [![docker pulls](https://img.shields.io/docker/pulls/andersonba/prometheus-assets)](https://hub.docker.com/r/andersonba/prometheus-assets) [![docker stars](https://img.shields.io/docker/stars/andersonba/prometheus-assets)](https://hub.docker.com/r/andersonba/prometheus-assets)

Explore and monitor your assets metrics using [Prometheus](https://prometheus.io) and [Grafana](https://grafana.com).


![Grafana](../resources/grafana.png)

## Getting started

First, you need to set up the exporter server. You can use official docker image [andersonba/prometheus-assets](https://hub.docker.com/r/andersonba/prometheus-assets/).

## Example

You can test all workspace in your machine using [docker-compose](https://docs.docker.com/compose/install/). Running the following command will set up Server, Prometheus and Grafana services.

```
docker-compose up
```

Server http://localhost:3000 • Grafana http://localhost:8080 • Prometheus http://localhost:9090

Now, you should import the [dashboard template](./grafana.json) to Grafana, see how: [Importing a dashboard from Grafana.com](https://grafana.com/docs/reference/export_import/#importing-a-dashboard)

## Configure

There are two ways to configure the server:

### Using a configuration file (Job scheduler)

If you don't prefer to put many targets in your prometheus configuration, you can configure a time-based job scheduler in the server. You just need to create a configuration file called `config.yml`. [See example](config.example.yml)

Now you have to configure only one target in your `prometheus.yml` using path `/metrics` in the server URL, without params. [See example](./prometheus.yml)

The server will scrap the pages every `1h`, but you can change it. [See configuration file](./config.example.yml).

| Attribute | Description | Type |
|-----------|-------------|------|
| `interval` | Interval time used in the job scheduler | number | 3600000 |
| `configurations` | List of pages to extract metrics | `Array<Configuration>` (See below)
| `labels` | List of common label names used in all page configurations | `Array<string>`
| `defaults` | Default values for the configuration objects | `{[configurationKey: string]: configurationValue}`
| `metricName` | Metric name used by Gauge collector. | string
| `enableOnDemandQuery` | Also enable on-demand scrapping (using query params, see below) | boolean
| `path` | Change the metrics path of the server | string

#### Configuration spec

In addition to the [options of scraper](../README.md#reference-api), there are some configurations here:

- `url` - **Required**. Page URL
- `metrics.file` - Boolean. Enable file metrics
- `metrics.count` - Boolean. Enable count metrics
- `metrics.size` - Boolean. Enable size metrics
- `metrics.gzip` - Boolean. Enable gzip metrics
- `metrics.countByMimeType` - Boolean. Enable countByMimeType metrics
- `metrics.sizeByMimeType` - Boolean. Enable sizeByMimeType metrics
- `metrics.gzipByMimeType` - Boolean. Enable gzipByMimeType metrics
- `labels` - Object. Key-value used to tag the prometheus metrics.

See more details in [example](./config.example.yml).

### Using multiples targets in Prometheus (On-demand)

The server have a route to scrap the page and extract the metrics on demand.

```
$ curl http://localhost:3000/metrics?url=www.andersonba.com
```

Nice! Now you have to configure the targets in your [prometheus.yml](https://prometheus.io/docs/prometheus/latest/configuration/configuration/). [See example](./prometheus.ondemand.yml#L2-L25)

Be careful about the amount of targets you set, since the on-demand is synchronous. If you want to monitor multiple sites, use the first approach.

#### URL params

| URL Param | Description | Type | Example |
|-----------|-------------|------|---------|
| `url` | **Required**. Page URL | `string` | `?url=google.com`
| `labels[]` | List of `key:value` labels | `Array<string>` | `?labels[]=page:anderson&labels[]=section:home`
| `mimeTypes[]` | List of mimeTypes to be filtered | `Array<string>` | `?mimeTypes[]=javascript&mimeTypes[]=css`

### Docker environments

- `CONFIG_PATH`
- `METRICS_PATH`
- `METRIC_NAME`
- `METRICS_ON_DEMAND_QUERY`
- `METRICS_INTERVAL`
- `METRICS_FILE_ENABLED`
- `METRICS_COUNT_ENABLED`
- `METRICS_SIZE_ENABLED`
- `METRICS_GZIP_ENABLED`
- `METRICS_COUNT_BY_MIMETYPE_ENABLED`
- `METRICS_SIZE_BY_MIMETYPE_ENABLED`
- `METRICS_GZIP_BY_MIMETYPE_ENABLED`

See more details in [settings.js](./settings.js).

#### Priority order of configurations:

1. Default values
1. Environment
1. Config file