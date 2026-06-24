import { readFileSync, existsSync, writeFileSync } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load .env
try {
  const { config } = await import('dotenv');
  const envConfig = config();
  if (envConfig.parsed && envConfig.parsed.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = envConfig.parsed.GEMINI_API_KEY;
  }
} catch {
  // Ignore
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY not found in environment.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const PATHS = {
  cv: 'cv.md',
  profile: 'modes/_profile.md',
  profileYml: 'config/profile.yml',
  shared: 'modes/_shared.md',
  report: 'reports/023-reacher-2026-06-24.md',
  outputFile: 'scratch/application-drafts.md',
};

function readFile(filePath) {
  if (existsSync(filePath)) {
    return readFileSync(filePath, 'utf-8').trim();
  }
  return '';
}

async function main() {
  const cv = readFile(PATHS.cv);
  const profileYml = readFile(PATHS.profileYml);
  const profileMd = readFile(PATHS.profile);
  const sharedMd = readFile(PATHS.shared);
  const report = readFile(PATHS.report);

  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest'
  ];

  let reacherNote = '';
  let lastError = null;

  const prompt = `You are career-ops, an AI job application assistant.
Your task is to write a high-quality "AI-Native Developer Note" to answer Reacher's specific application question:
"Please send a short note about a complex problem you solved or a new skill you mastered specifically using an AI-driven workflow. GitHub/LinkedIn/resume is great, but we care more about how you think, build, and leverage AI. If you have examples of projects where AI coding tools were central to your workflow in the last 90 days, we'd love to see them."

CANDIDATE CV:
${cv}

CANDIDATE PROFILE & TARGETS:
${profileYml}
${profileMd}

ROLE EVALUATION REPORT:
${report}

SHARED STYLE GUIDELINES:
${sharedMd}

INSTRUCTIONS:
1. Write a compelling, highly technical, and professional response in the first person ("I").
2. Focus on the candidate's actual projects, particularly:
   - The Autonomous AI QA Orchestration Platform at Payoneer (using commit-aware impact analysis, multimodal execution, and MCP servers across Jira, Notion, and Playwright).
   - Or the DSM Agent (scrum automation with live Jira ingestion and deterministic fallbacks).
3. Frame the note to show a deep understanding of agentic workflows, prompt engineering, context engineering (CLAUDE.md), and custom MCP integrations—mirroring Reacher's AI-pilled culture (they use Claude Code as their primary environment).
4. Keep the note around 200-300 words.
5. Provide ONLY the final note content ready for copy-pasting. No conversational chatter or introductory sentences.`;

  for (const currentModelName of candidateModels) {
    console.log(`🤖  Trying Gemini model for drafting: ${currentModelName}...`);
    const model = genAI.getGenerativeModel({
      model: currentModelName,
      generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
    });

    let attempt = 1;
    const maxAttempts = 3;
    let success = false;

    while (attempt <= maxAttempts) {
      try {
        const result = await model.generateContent(prompt);
        reacherNote = result.response.text().trim();
        success = true;
        break;
      } catch (err) {
        lastError = err;
        console.warn(`⚠️  [${currentModelName}] Attempt ${attempt} failed: ${err.message}`);
        if (err.message.includes('503') || err.message.includes('Service Unavailable') || err.message.includes('high demand')) {
          console.log('Sleeping 3 seconds before retry...');
          await new Promise(r => setTimeout(r, 3000));
          attempt++;
        } else {
          break;
        }
      }
    }
    if (success) break;
  }

  if (!reacherNote) {
    throw lastError || new Error('All models failed to generate content');
  }

  const fileContent = `# Job Application Drafts

This document contains generated answers for your high-match applications from \`pipeline.md\`.

---

## 1. Reacher — Backend Software Engineer - India

* **URL:** [Apply Page](https://jobs.ashbyhq.com/reacher/86a866da-dc3b-4d5d-ba94-599b642904ec)
* **Match Score:** 4.6/5
* **Legitimacy:** High Confidence

### Required Custom Note:
> *Reacher asks to send a short note about a complex problem you solved specifically using an AI-driven workflow or projects where AI coding tools were central to your workflow in the last 90 days.*

**Draft Response:**
${reacherNote}

---

## 2. Fermi AI — AI Engineer - MyRico

* **URL:** [Apply Page](https://jobs.ashbyhq.com/Fermi%20AI/a4cf68d9-40c1-43f8-84cd-7ec262fc1bd6)
* **Match Score:** 4.2/5
* **Legitimacy:** High Confidence

### Required Application Info:
*No custom text questions detected on this application form. You only need to submit your standard information (Resume, LinkedIn, Name, Email).*

---

## 3. Articul8 AI — Product/Software Engineer-Backend (Hold Recommendation)

* **URL:** [Apply Page](https://jobs.ashbyhq.com/articul8/21e643cf-0cf0-48ea-898b-c1b17926d2fb)
* **Match Score:** 3.8/5
* **Legitimacy:** Proceed with Caution

**⚠️ Recommendation: Hold**
*This role requires 7+ YOE. The match score of 3.8/5 is below our target threshold of 4.0/5. We recommend against applying unless the company explicitly indicates they are open to downleveling to a mid-level SDE role.*
`;

  writeFileSync(PATHS.outputFile, fileContent, 'utf-8');
  console.log(`Updated drafts written to ${PATHS.outputFile}`);
}

main().catch(console.error);
