import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { chromium } from 'playwright';

let apiKey = process.env.GEMINI_API_KEY;
if (existsSync('.env')) {
  const envContent = readFileSync('.env', 'utf-8');
  const match = envContent.match(/^GEMINI_API_KEY=(.+)$/m);
  if (match) {
    apiKey = match[1].trim();
  }
}

if (!apiKey) {
  console.error("No API key found.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

function readFile(filePath) {
  if (!existsSync(filePath)) return '';
  return readFileSync(filePath, 'utf-8').trim();
}

const sharedContext  = readFile('modes/_shared.md');
const ofertaLogic    = readFile('modes/oferta.md');
const cvContent      = readFile('cv.md');
const profileContent = readFile('modes/_profile.md');
const profileYml     = readFile('config/profile.yml');

const systemPrompt = `You are career-ops, an AI-powered job search assistant.
You evaluate job offers against the user's CV using a structured A-G scoring system.

Your evaluation methodology is defined below. Follow it exactly.

═══════════════════════════════════════════════════════
SYSTEM CONTEXT (_shared.md)
═══════════════════════════════════════════════════════
${sharedContext}

═══════════════════════════════════════════════════════
EVALUATION MODE (oferta.md)
═══════════════════════════════════════════════════════
${ofertaLogic}

═══════════════════════════════════════════════════════
CANDIDATE RESUME (cv.md)
═══════════════════════════════════════════════════════
${cvContent}

═══════════════════════════════════════════════════════
CANDIDATE PROFILE & TARGETS (config/profile.yml)
═══════════════════════════════════════════════════════
${profileYml}

═══════════════════════════════════════════════════════
USER ARCHETYPES & NARRATIVE (_profile.md)
═══════════════════════════════════════════════════════
${profileContent}

═══════════════════════════════════════════════════════
IMPORTANT OPERATING RULES FOR THIS CLI SESSION
═══════════════════════════════════════════════════════
1. You do NOT have access to WebSearch, Playwright, or file writing tools.
   - For Block D (Comp research): provide salary estimates based on your training data, clearly noted as estimates.
   - For Block G (Legitimacy): analyze the JD text only; skip URL/page freshness checks.
   - Post-evaluation file saving is handled by the script, not by you.
2. Generate Blocks A through G in full, in English, unless the JD is in another language.
3. At the very end, output a machine-readable summary block in this exact format:

---SCORE_SUMMARY---
COMPANY: <company name or "Unknown">
ROLE: <role title>
SCORE: <global score as decimal, e.g. 3.8>
ARCHETYPE: <detected archetype>
LEGITIMACY: <High Confidence | Proceed with Caution | Suspicious>
---END_SUMMARY---
`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  
  const url = 'https://jobs.ashbyhq.com/bland/681dfcda-f016-4bda-826e-7e813fae0083';
  await page.goto(url, { waitUntil: 'networkidle' });
  const jdText = await page.evaluate(() => document.body?.innerText ?? '');
  await browser.close();

  console.log(`Bland JD fetched: ${jdText.length} chars.`);

  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
  console.log("Calling gemini-3.1-flash-lite...");
  try {
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: jdText }
    ]);
    const text = result.response.text();
    console.log("Success! Full output:\n");
    console.log(text);
  } catch (err) {
    console.error("Failed:", err.message);
  }
}

main();
