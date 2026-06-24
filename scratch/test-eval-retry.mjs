import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

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

const jdText = readFileSync('scratch/temp-jd.txt', 'utf-8');

async function testModelWithRetry(modelName, retries = 3) {
  console.log(`\nTesting ${modelName} with ${retries} retries...`);
  const model = genAI.getGenerativeModel({ model: modelName });
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempt ${attempt} for ${modelName}...`);
      const result = await model.generateContent([
        { text: systemPrompt },
        { text: jdText }
      ]);
      const text = result.response.text();
      console.log(`🎉 Success for ${modelName} on attempt ${attempt}! Length: ${text.length}`);
      console.log(text.substring(0, 500) + '\n...\n' + text.substring(text.length - 300));
      return true;
    } catch (err) {
      console.error(`Attempt ${attempt} failed: ${err.message}`);
      if (err.message.includes('503') || err.message.includes('Service Unavailable') || err.message.includes('high demand')) {
        console.log('Sleeping 5 seconds before retry...');
        await new Promise(r => setTimeout(r, 5000));
      } else {
        break;
      }
    }
  }
  return false;
}

async function main() {
  const models = [
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3.5-flash',
    'gemini-flash-latest'
  ];
  for (const m of models) {
    const success = await testModelWithRetry(m);
    if (success) {
      console.log(`🚀 Found working model: ${m}`);
      break;
    }
  }
}

main();
