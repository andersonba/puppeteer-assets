const puppeteer = require('puppeteer');
const { get } = require('lodash');

function sanitizeUrl(url) {
  if (!/^(?:f|ht)tps?:\/\//.test(url)) {
    return `https://${url}`;
  }
  return url;
}

async function run(pageUrl, options = {}) {
  const {
    mimeTypes = ['javascript'],
    internalRegex,
  } = options;

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  const session = await page.target().createCDPSession();
  await session.send('Network.enable');

  const responses = {};
  session.on('Network.responseReceived', (event) => {
    responses[event.requestId] = event.response;
  });

  const assets = {};
  session.on('Network.dataReceived', (event) => {
    const { url, mimeType } = responses[event.requestId];
    const mimeTypeMatched = mimeTypes
      .map(type => new RegExp(type).test(mimeType))
      .every(b => b);

    if (url.startsWith('data:') || !mimeTypeMatched) {
      return;
    }

    const isInternal = url.startsWith(pageUrl) || (internalRegex ? new RegExp(internalRegex).test(url) : false);
    const asset = assets[url];
    assets[url] = {
      mimeType,
      type: isInternal ? 'internal' : 'external',
      encodedLength: get(asset, 'encodedLength', 0) + event.encodedDataLength,
      length: get(asset, 'length', 0) + event.dataLength,
    };
  });

  await page.goto(sanitizeUrl(pageUrl), {
    waitUntil: 'networkidle0',
  });

  await browser.close();

  let totalLength = 0;
  let totalEncodedLength = 0;
  Object.values(assets).forEach((asset) => {
    totalLength += asset.length;
    totalEncodedLength += asset.encodedLength;
  });

  return {
    assets,
    totalLength,
    totalEncodedLength,
    internalCount: Object.keys(assets).filter(k => assets[k].type === 'internal').length,
    externalCount: Object.keys(assets).filter(k => assets[k].type === 'external').length,
    count: Object.keys(assets).length,
  };
}

module.exports = run;
