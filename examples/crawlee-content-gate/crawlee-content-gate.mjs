import { CheerioCrawler } from '@crawlee/cheerio';
import { Configuration } from '@crawlee/core';

// One public page, one request, no recursive crawling.
const [urlArgument, expectedTitle] = process.argv.slice(2);
let target;
try {
  target = new URL(urlArgument);
  if (target.protocol !== 'https:' || !expectedTitle?.trim()) throw Error();
} catch {
  console.error('Usage: node crawlee-content-gate.mjs HTTPS_URL EXPECTED_TITLE_FRAGMENT');
  process.exit(2);
}

const rows = [];
const failedRequests = [];
const config = new Configuration({ persistStorage: false });
const crawler = new CheerioCrawler({
  maxConcurrency: 1,
  maxRequestsPerCrawl: 1,
  maxRequestRetries: 0,
  useSessionPool: false,
  ignoreSslErrors: false,
  async requestHandler({ request, response, $ }) {
    const title = $('title').text().trim();
    const loadedUrl = request.loadedUrl ?? request.url;
    const sameOrigin = new URL(loadedUrl).origin === target.origin;
    const httpOk = response.statusCode >= 200 && response.statusCode < 300;
    const titleMatches = title.includes(expectedTitle);
    rows.push({
      requestedUrl: request.url,
      loadedUrl,
      httpStatus: response.statusCode,
      title,
      sameOrigin,
      titleMatches,
      contentGatePassed: httpOk && sameOrigin && titleMatches,
    });
    // A content mismatch stays in the result. Do not throw and retry it here.
  },
  async failedRequestHandler({ request }) {
    failedRequests.push({ url: request.url, errors: request.errorMessages });
  },
}, config);

const stats = await crawler.run([{
  url: target.href,
  headers: { 'User-Agent': 'BrowseSprint-owner-public-content-check/1.0' },
}]);
const passed = rows.filter(row => row.contentGatePassed).length;
const outcomePassed = stats.requestsFinished === 1
  && stats.requestsFailed === 0
  && failedRequests.length === 0
  && rows.length === 1
  && passed === 1;
console.log(JSON.stringify({
  capturedAtUtc: new Date().toISOString(),
  runtime: process.version,
  examplePackageVersion: '3.18.2',
  expectedTitleFragment: expectedTitle,
  requestsFinished: stats.requestsFinished,
  requestsFailed: stats.requestsFailed,
  rowsProduced: rows.length,
  contentChecksPassed: passed,
  contentChecksFailed: rows.length - passed,
  outcomePassed,
  rows,
  failedRequests,
  scope: 'One HTTP HTML title check; no JavaScript, browser interaction, form submission, delivery check or performance comparison.',
}, null, 2));
process.exitCode = outcomePassed ? 0 : 1;
