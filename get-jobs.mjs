import { chromium } from 'playwright';

async function getJobs(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(10000); // More time for Ashby
    const data = await page.evaluate(() => {
      const results = [];
      const links = Array.from(document.querySelectorAll('a'));
      for (const link of links) {
        const text = link.innerText.trim();
        const href = link.href;
        // Basic filter for job links
        if (href.includes('/job/') || href.includes('/jobs/')) {
          // Look for location info in parent or nearby
          let parentText = link.parentElement ? link.parentElement.innerText : '';
          results.push({ text, href, parentText });
        }
      }
      return results;
    });
    return data;
  } catch (e) {
    return { error: e.message };
  } finally {
    await browser.close();
  }
}

(async () => {
  const targets = [
    'https://jobs.ashbyhq.com/sarvam',
    'https://jobs.ashbyhq.com/abnormal-security',
    'https://boards.greenhouse.io/gleanwork'
  ];

  for (const url of targets) {
    console.log(`\n--- ${url} ---`);
    const jobs = await getJobs(url);
    if (jobs.error) {
      console.log(`Error: ${jobs.error}`);
    } else {
      jobs.forEach(j => {
        const combined = (j.text + ' ' + j.parentText).toLowerCase();
        if (combined.includes('india') || combined.includes('bangalore') || combined.includes('bengaluru') || combined.includes('gurugram') || combined.includes('gurgaon')) {
          console.log(`${j.text} | ${j.href}`);
        }
      });
    }
  }
})();
