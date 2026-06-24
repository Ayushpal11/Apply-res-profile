import { readFileSync, writeFileSync, existsSync } from 'fs';
import { chromium } from 'playwright';
import yaml from 'js-yaml';

import {
  buildTitleFilter,
  buildLocationFilter,
  loadSeenUrls,
  appendToPipeline,
  appendToScanHistory
} from '../scan.mjs';
import { checkUrlLiveness } from '../liveness-browser.mjs';

const PORTALS_PATH = 'portals.yml';

function extractCompanyFromUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const host = url.hostname;
    if (host.includes('ashbyhq.com')) {
      const parts = url.pathname.split('/');
      return parts[1] || '';
    }
    if (host.includes('greenhouse.io')) {
      const parts = url.pathname.split('/');
      if (parts[1] === 'v1' || parts[1] === 'embed' || parts[1] === 'job-boards') {
        return parts[2] || parts[3] || '';
      }
      return parts[1] || '';
    }
    if (host.includes('lever.co')) {
      const parts = url.pathname.split('/');
      return parts[1] || '';
    }
    return host.replace('www.', '').split('.')[0];
  } catch {
    return '';
  }
}

async function main() {
  if (!existsSync(PORTALS_PATH)) {
    console.error('Error: portals.yml not found.');
    process.exit(1);
  }

  const rawConfig = yaml.load(readFileSync(PORTALS_PATH, 'utf-8'));
  const config = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
  const titleFilter = buildTitleFilter(config.title_filter);
  const locationFilter = buildLocationFilter(config.location_filter);

  const { seen } = loadSeenUrls();
  console.log(`Loaded ${seen.size} seen URLs.`);

  const urls = [
    'https://jobs.ashbyhq.com/emergence/c72a7952-5d8a-4b2e-b0b2-0e349152fefd',
    'https://jobs.ashbyhq.com/emergence/d91a1451-a6a4-46b5-9b92-04d38e0062da',
    'https://jobs.ashbyhq.com/Pulsora%20Inc/94d2db5c-8e55-48ec-ad52-738691a34924',
    'https://jobs.ashbyhq.com/soulside%20ai/041401b5-bd04-4c78-aff4-4b713c3627ae',
    'https://jobs.ashbyhq.com/outmarket/716e3319-1d72-4f8d-b5d9-efb9de1cf72f'
  ];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await context.newPage();

  const newOffers = [];
  const today = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    if (seen.has(url)) {
      console.log(`Already seen: ${url}`);
      continue;
    }
    console.log(`[${i+1}/${urls.length}] Verifying: ${url}`);
    
    try {
      const liveness = await checkUrlLiveness(page, url);
      if (liveness.result === 'active') {
        const title = await page.evaluate(() => {
          const h1 = document.querySelector('h1')?.innerText?.trim();
          if (h1) return h1;
          const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim();
          if (ogTitle) return ogTitle;
          return document.title;
        });

        const company = extractCompanyFromUrl(url);
        const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
        
        // Simple location extraction
        const locationMatch = bodyText.match(/(?:Location|Office|Based in|Remote):\s*([^\n,]+)/i);
        const location = locationMatch ? locationMatch[1].trim() : 'Remote';

        const offer = {
          url: url,
          title: title || 'Software Engineer',
          company: company,
          source: 'Agent-Search',
          location: location
        };

        if (titleFilter(offer.title) && locationFilter(offer.location)) {
          console.log(`  ✅ Match: ${offer.company} - ${offer.title} (${offer.location})`);
          newOffers.push(offer);
        } else {
          console.log(`  ❌ Filtered by Title/Location: "${offer.title}" at "${offer.company}" (${offer.location})`);
          appendToScanHistory([offer], today, 'skipped_title');
        }
      } else {
        console.log(`  ❌ Not active/liveness failed (${liveness.result}: ${liveness.reason})`);
        const offer = {
          url: url,
          title: 'Unknown',
          company: extractCompanyFromUrl(url),
          source: 'Agent-Search',
          location: ''
        };
        appendToScanHistory([offer], today, 'skipped_expired');
      }
    } catch (err) {
      console.error(`Failed to verify ${url}: ${err.message}`);
    }

    await page.waitForTimeout(3000);
  }

  if (newOffers.length > 0) {
    console.log(`Adding ${newOffers.length} new matches to pipeline...`);
    appendToPipeline(newOffers);
    appendToScanHistory(newOffers, today, 'added');
  } else {
    console.log('No new matches found.');
  }

  await browser.close();
  console.log('Verification finished.');
}

main().catch(console.error);
