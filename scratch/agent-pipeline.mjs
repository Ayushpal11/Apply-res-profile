import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { chromium } from 'playwright';

const PIPELINE_PATH = 'data/pipeline.md';

function slugifyCompany(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
}

async function extractJd(page, url) {
  if (url.startsWith('local:')) {
    const filePath = url.slice(6);
    if (existsSync(filePath)) {
      return readFileSync(filePath, 'utf-8');
    }
    throw new Error(`Local file not found: ${filePath}`);
  }

  await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
  
  const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
  if (!bodyText || bodyText.trim().length < 200) {
    throw new Error('Insufficient page content loaded');
  }
  return bodyText;
}

async function main() {
  if (!existsSync(PIPELINE_PATH)) {
    console.error('Error: pipeline.md not found.');
    process.exit(1);
  }

  let pipelineText = readFileSync(PIPELINE_PATH, 'utf-8');
  
  // Parse Pending list
  const lines = pipelineText.split('\n');
  const pendingSectionStart = lines.findIndex(l => l.trim().startsWith('## Pending') || l.trim().startsWith('## Pendientes'));
  const processedSectionStart = lines.findIndex(l => l.trim().startsWith('## Processed') || l.trim().startsWith('## Procesadas'));

  if (pendingSectionStart === -1) {
    console.error('Could not find Pending section.');
    process.exit(1);
  }

  const endIdx = processedSectionStart === -1 ? lines.length : processedSectionStart;
  
  const pendingLinesInfo = [];
  for (let i = pendingSectionStart + 1; i < endIdx; i++) {
    const line = lines[i].trim();
    if (line.startsWith('- [ ]') || line.startsWith('- [!]')) {
      // Format: - [ ] URL | Company | Role [— Error: ...]
      // Or just - [ ] URL
      const cleanLine = line.split('— Error:')[0].trim();
      const parts = cleanLine.slice(5).split('|').map(p => p.trim());
      const url = parts[0];
      const company = parts[1] || '';
      const role = parts[2] || '';
      // Skip already processed Boomi to save time/tokens since it was evaluated
      if (url.includes('boomi.com') && url.includes('gh_jid=5617156004')) {
        continue;
      }
      pendingLinesInfo.push({ lineIndex: i, rawLine: lines[i], url, company, role });
    }
  }

  if (pendingLinesInfo.length === 0) {
    console.log('No pending URLs in pipeline.');
    process.exit(0);
  }

  console.log(`Found ${pendingLinesInfo.length} pending URLs to process.`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await context.newPage();

  const tempJdPath = 'scratch/temp-jd.txt';

  for (const info of pendingLinesInfo) {
    console.log(`\nProcessing: ${info.url}`);
    
    try {
      // 1. Extract JD
      const jdText = await extractJd(page, info.url);
      writeFileSync(tempJdPath, jdText, 'utf-8');

      // 2. Execute gemini-eval
      console.log(`Running evaluation for ${info.url}...`);
      let geminiKey = process.env.GEMINI_API_KEY;
      if (existsSync('.env')) {
        const envContent = readFileSync('.env', 'utf-8');
        const match = envContent.match(/^GEMINI_API_KEY=(.+)$/m);
        if (match) {
          geminiKey = match[1].trim();
        }
      }
      
      const output = execFileSync(process.execPath, ['gemini-eval.mjs', '--file', tempJdPath], {
        encoding: 'utf-8',
        env: { 
          ...process.env,
          GEMINI_API_KEY: geminiKey
        }
      });

      // 3. Parse report number and score from gemini-eval output
      // Output examples:
      // "✅  Report saved: reports/004-emergence-2026-06-23.md"
      // "Score: 3.8/5"
      const reportMatch = output.match(/reports\/(\d{3})-([^\s.]+)\.md/);
      const scoreMatch = output.match(/Score:\s*([0-9.]+\/5)/i);
      
      const reportNum = reportMatch ? reportMatch[1] : '???';
      const companySlug = reportMatch ? reportMatch[2] : 'unknown';
      const score = scoreMatch ? scoreMatch[1] : '?/5';

      console.log(`  Result: #${reportNum} | Score: ${score}`);

      // 4. Update the line in lines array
      // Target: - [x] #NNN | URL | Company | Role | Score/5 | PDF ❌
      const companyDisplay = info.company || companySlug;
      const roleDisplay = info.role || 'Software Engineer';
      
      // Mark as processed (uncheck from Pending, we will move it to Processed section)
      lines[info.lineIndex] = ''; // clear from Pending
      
      // Append to Processed section (right after processedSectionStart)
      const processedLine = `- [x] #${reportNum} | ${info.url} | ${companyDisplay} | ${roleDisplay} | ${score} | PDF ❌`;
      
      const procIdx = lines.findIndex(l => l.trim().startsWith('## Processed') || l.trim().startsWith('## Procesadas'));
      lines.splice(procIdx + 1, 0, processedLine);
      
    } catch (err) {
      console.error(`❌ Failed to process ${info.url}: ${err.message}`);
      // Mark line as failed: - [!] URL | Company | Role — Error: message
      const errorMsg = err.message.split('\n')[0].replace(/\|/g, '/');
      lines[info.lineIndex] = `- [!] ${info.url} | ${info.company || 'Unknown'} | ${info.role || 'Role'} — Error: ${errorMsg}`;
    }

    // Write file state iteratively so progress is saved
    writeFileSync(PIPELINE_PATH, lines.filter(l => l !== null).join('\n'), 'utf-8');
    
    // Add delay between runs
    await page.waitForTimeout(3000);
  }

  await browser.close();
  console.log('\nFinished pipeline processing.');
}

main().catch(console.error);
