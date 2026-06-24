import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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

async function searchDDG(page, query) {
  console.log(`Searching DDG for: "${query}"`);
  try {
    await page.goto(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      { waitUntil: 'domcontentloaded', timeout: 15000 }
    );
    const urls = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a.result__a'))
        .map((a) => a.getAttribute('href'))
        .filter(Boolean)
    );
    return urls;
  } catch (err) {
    console.error(`DDG search failed for query: "${query}" - ${err.message}`);
    return [];
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

  // Load seen URLs to prevent duplicate checking
  const { seen } = loadSeenUrls();
  console.log(`Loaded ${seen.size} seen URLs.`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await context.newPage();

  // Queries to run matching "Sde 1, ai engineer 1 yr exp" in India/Remote
  const queries = [
    { name: 'Ashby — SDE 1 / AI Engineer', q: 'site:jobs.ashbyhq.com ("SDE 1" OR "SDE I" OR "Junior AI" OR "Associate AI") (India OR Remote)' },
    { name: 'Greenhouse — SDE 1 / AI Engineer', q: 'site:boards.greenhouse.io OR site:job-boards.greenhouse.io ("SDE 1" OR "SDE I" OR "Junior AI" OR "Associate AI") (India OR Remote)' },
    { name: 'Lever — SDE 1 / AI Engineer', q: 'site:jobs.lever.co ("SDE 1" OR "SDE I" OR "Junior AI" OR "Associate AI") (India OR Remote)' },
    { name: 'Ashby — AI Engineer 1 Yr Exp', q: 'site:jobs.ashbyhq.com "AI Engineer" ("1 year" OR "1 yr" OR "Junior" OR "Associate") (India OR Remote)' },
    { name: 'Greenhouse — AI Engineer 1 Yr Exp', q: 'site:boards.greenhouse.io OR site:job-boards.greenhouse.io "AI Engineer" ("1 year" OR "1 yr" OR "Junior" OR "Associate") (India OR Remote)' },
    { name: 'Lever — AI Engineer 1 Yr Exp', q: 'site:jobs.lever.co "AI Engineer" ("1 year" OR "1 yr" OR "Junior" OR "Associate") (India OR Remote)' }
  ];

  const candidates = [];

  for (const queryInfo of queries) {
    const urls = await searchDDG(page, queryInfo.q);
    for (const url of urls) {
      if (seen.has(url)) {
        continue;
      }
      // Check if it's a job portal or company url
      if (url.includes('jobs.ashbyhq.com') || url.includes('greenhouse.io') || url.includes('lever.co') || url.includes('openai.com') || url.includes('retool.com') || url.includes('make.com')) {
        candidates.push({ url, source: queryInfo.name });
      }
    }
    // Respect DDG rate limits
    await page.waitForTimeout(2000);
  }

  console.log(`Found ${candidates.length} candidate URLs to verify.`);

  const newOffers = [];
  const today = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    console.log(`[${i+1}/${candidates.length}] Verifying: ${candidate.url}`);
    
    try {
      const liveness = await checkUrlLiveness(page, candidate.url);
      if (liveness.result === 'active') {
        const title = await page.evaluate(() => {
          const h1 = document.querySelector('h1')?.innerText?.trim();
          if (h1) return h1;
          const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim();
          if (ogTitle) return ogTitle;
          return document.title;
        });

        const company = extractCompanyFromUrl(candidate.url) || candidate.source;
        const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
        
        // Simple location extraction from text
        const locationMatch = bodyText.match(/(?:Location|Office|Based in|Remote):\s*([^\n,]+)/i);
        const location = locationMatch ? locationMatch[1].trim() : 'Remote';

        const offer = {
          url: candidate.url,
          title: title || 'Software Engineer',
          company: company,
          source: candidate.source,
          location: location
        };

        if (titleFilter(offer.title) && locationFilter(offer.location)) {
          console.log(`  ✅ Match: ${offer.company} - ${offer.title} (${offer.location})`);
          newOffers.push(offer);
          seen.add(offer.url); // prevent duplicate adding
        } else {
          console.log(`  ❌ Filtered by Title/Location: "${offer.title}" at "${offer.company}" (${offer.location})`);
          appendToScanHistory([offer], today, 'skipped_title');
        }
      } else {
        console.log(`  ❌ Not active/liveness failed (${liveness.result}: ${liveness.reason})`);
        const offer = {
          url: candidate.url,
          title: 'Unknown',
          company: extractCompanyFromUrl(candidate.url) || candidate.source,
          source: candidate.source,
          location: ''
        };
        appendToScanHistory([offer], today, 'skipped_expired');
      }
    } catch (err) {
      console.error(`Failed to verify ${candidate.url}: ${err.message}`);
    }

    // Add delay between page visits
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
  console.log('Finished Agent WebSearch scan.');
}

main().catch(console.error);
