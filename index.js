const puppeteer = require('puppeteer');
const { get, set } = require('lodash');

const IGNORE_ASSET_REGEX = /(^data:)/;

function sanitizeUrl(url) {
  if (!/^(?:f|ht)tps?:\/\//.test(url)) return `https://${url}`;
  return url;
}

function incr(obj, key, val = 1) {
  set(obj, key, val + (obj[key] || 0));
}

async function run(plainUrl, options = {}) {
  const pageUrl = sanitizeUrl(plainUrl);
  const { mimeTypes = ['javascript'], internalPattern } = options;

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
    const { url, mimeType } = responses[event.requestId];

    // should ignore asset?
    if (
      IGNORE_ASSET_REGEX.test(url)
      || mimeTypes.some((type) => !new RegExp(type).test(mimeType))
    ) {
      return;
    }

    const isInternal = url.startsWith(pageUrl)
      || (internalPattern ? new RegExp(internalPattern).test(url) : false);
    const asset = assets[url];
    assets[url] = {
      mimeType,
      type: isInternal ? 'internal' : 'external',
      encodedSize: get(asset, 'encodedSize', 0) + event.encodedDataLength,
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
    count: {
      internal: {},
      external: {},
    },
    size: {
      internal: {},
      external: {},
    },
    encodedSize: {
      internal: {},
      external: {},
    },
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

    // encodedSize
    incr(output.encodedSize, 'total', asset.encodedSize);
    incr(output.encodedSize[asset.type], 'total', asset.encodedSize);
    incr(output.encodedSize[asset.type], asset.mimeType, asset.encodedSize);
  });

  return output;
}

module.exports = run;
