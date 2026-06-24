import { chromium } from 'playwright';

async function checkUrl(url) {
  console.log(`Checking URL: ${url}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
    console.log(`Title: ${title}`);
    console.log(`Body length: ${bodyText.length}`);
    console.log(`Snippet:\n${bodyText.substring(0, 400)}\n`);
  } catch (err) {
    console.error(`Failed to load ${url}:`, err.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  const urls = [
    'https://jobs.ashbyhq.com/bland/681dfcda-f016-4bda-826e-7e813fae0083',
    'https://jobs.ashbyhq.com/vapi/d270d613-30b8-4fdc-96e0-514993ca7a82',
    'https://boomi.com/boomi-jobs/?gh_jid=5617156004'
  ];
  for (const url of urls) {
    await checkUrl(url);
  }
}

main();
