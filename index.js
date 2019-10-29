const puppeteer = require('puppeteer');
const { get, merge } = require('lodash');
const { sanitizeUrl, incr, detectMimeType } = require('./utils');
const constants = require('./constants');

async function run(plainUrl, options = {}) {
  const pageUrl = sanitizeUrl(plainUrl);
  const mimeTypes = options.mimeTypes || constants.defaultMimeTypes;
  const mimeTypePatterns = merge({}, constants.defaultMimeTypePatterns, options.mimeTypePatterns);
  const { ignorePatterns = [], internalPatterns = [] } = options;

  // --- Prepare Browser ---
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  const session = await page.target().createCDPSession();
  await session.send('Network.enable');

  const responses = {};
  session.on('Network.responseReceived', (event) => {
    responses[event.requestId] = event.response;
  });

  // --- Listen and count assets -
  const assets = {};
  session.on('Network.dataReceived', (event) => {
    const { url, mimeType: rawMimeType } = responses[event.requestId];

    if (
      constants.ignoreAssetPattern.test(url)
      || ignorePatterns.some((p) => new RegExp(p).test(url))
    ) return;

    // check mime type based on enabled list and patterns
    const mimeType = detectMimeType(rawMimeType, mimeTypes, mimeTypePatterns);
    if (!mimeType) return;

    const isInternal = url.startsWith(pageUrl)
      || (internalPatterns.length
        ? internalPatterns.some((p) => new RegExp(p).test(url))
        : false);

    const asset = assets[url];
    assets[url] = {
      mimeType,
      rawMimeType,
      type: isInternal ? 'internal' : 'external',
      gzip: get(asset, 'gzip', 0) + event.encodedDataLength,
      size: get(asset, 'size', 0) + event.dataLength,
    };
  });

  // --- Opening URL ---
  await page.goto(pageUrl, {
    waitUntil: 'networkidle0',
  });
  await browser.close();

  // --- Generating report ---
  const output = {
    assets,
    count: { internal: { total: 0 }, external: { total: 0 } },
    size: { internal: { total: 0 }, external: { total: 0 } },
    gzip: { internal: { total: 0 }, external: { total: 0 } },
  };

  Object.values(assets).forEach((asset) => {
    // count
    incr(output.count, 'total');
    incr(output.count[asset.type], 'total');
    incr(output.count[asset.type], asset.mimeType);

    // size
    incr(output.size, 'total', asset.size);
    incr(output.size[asset.type], 'total', asset.size);
    incr(output.size[asset.type], asset.mimeType, asset.size);

    // gzip
    incr(output.gzip, 'total', asset.gzip);
    incr(output.gzip[asset.type], 'total', asset.gzip);
    incr(output.gzip[asset.type], asset.mimeType, asset.gzip);
  });

  return output;
}

module.exports = run;
