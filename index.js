const puppeteer = require('puppeteer');
const { get } = require('lodash');

const IGNORE_ASSET_REGEX = /(^data:)/;

function sanitizeUrl(url) {
  if (!/^(?:f|ht)tps?:\/\//.test(url)) return `https://${url}`;
  return url;
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
      encodedLength: get(asset, 'encodedLength', 0) + event.encodedDataLength,
      length: get(asset, 'length', 0) + event.dataLength,
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
    count: 0,
    internalCount: 0,
    externalCount: 0,
    totalLength: 0,
    totalEncodedLength: 0,
  };

  Object.values(assets).forEach((asset) => {
    output.count += 1;
    output.totalLength += asset.length;
    output.totalEncodedLength += asset.encodedLength;
    if (asset.type === 'internal') {
      output.internalCount += 1;
    } else {
      output.externalCount += 1;
    }
  });

  return output;
}

module.exports = run;
