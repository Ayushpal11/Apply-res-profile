import { readFileSync, existsSync, writeFileSync } from 'fs';
import { chromium } from 'playwright';
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
  outputFile: 'scratch/application-drafts.md',
};

function readFile(filePath) {
  if (existsSync(filePath)) {
    return readFileSync(filePath, 'utf-8').trim();
  }
  return '';
}

async function scrapeForm(page, url) {
  console.log(`Scraping form questions from: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const fields = await page.evaluate(() => {
      const results = [];
      const processedInputs = new Set();
      
      // Standard search using label tags
      const labelElements = Array.from(document.querySelectorAll('label'));
      for (const label of labelElements) {
        const labelText = label.innerText?.replace(/\s+/g, ' ').trim() || '';
        if (!labelText) continue;

        // Filter out basic standard fields
        const lowerText = labelText.toLowerCase();
        if (
          lowerText.includes('resume') || 
          lowerText.includes('cv') || 
          lowerText.includes('full name') || 
          lowerText.includes('first name') || 
          lowerText.includes('last name') || 
          lowerText.includes('email') || 
          lowerText.includes('phone') || 
          lowerText.includes('linkedin') || 
          lowerText.includes('portfolio') || 
          lowerText.includes('website') || 
          lowerText.includes('github') ||
          lowerText.includes('photo')
        ) {
          continue;
        }

        let inputElement = null;
        const htmlFor = label.getAttribute('for');
        if (htmlFor) {
          inputElement = document.getElementById(htmlFor);
        }
        if (!inputElement) {
          inputElement = label.querySelector('input, textarea, select') || 
                         label.parentElement?.querySelector('input, textarea, select') ||
                         label.nextElementSibling?.querySelector('input, textarea, select');
        }

        if (inputElement) {
          if (processedInputs.has(inputElement)) continue;
          processedInputs.add(inputElement);

          const type = inputElement.tagName.toLowerCase() === 'input' 
            ? inputElement.getAttribute('type') || 'text' 
            : inputElement.tagName.toLowerCase();

          let options = [];
          if (type === 'select') {
            options = Array.from(inputElement.querySelectorAll('option'))
              .map(o => o.innerText.trim())
              .filter(Boolean);
          }

          const required = inputElement.hasAttribute('required') || labelText.includes('*');
          results.push({ label: labelText, type, required, options });
        }
      }

      // Workable Specific / Fallback custom inputs search
      if (results.length === 0) {
        // Workable uses divs with question labels
        const workableQuestions = Array.from(document.querySelectorAll('[data-ui="field-label"], [class*="WorkableQuestion"], textarea'));
        for (const q of workableQuestions) {
          if (q.tagName.toLowerCase() === 'textarea') {
            const parentLabel = q.parentElement?.previousElementSibling?.innerText || q.parentElement?.innerText || '';
            const labelText = parentLabel.split('\n')[0].trim();
            if (labelText && !processedInputs.has(q)) {
              results.push({ label: labelText, type: 'textarea', required: q.hasAttribute('required'), options: [] });
              processedInputs.add(q);
            }
          }
        }
      }

      return results;
    });

    const pageText = await page.evaluate(() => document.body.innerText);
    return { fields, pageText };

  } catch (err) {
    console.error(`Error scraping ${url}: ${err.message}`);
    return { fields: [], pageText: '' };
  }
}

async function draftAnswerWithGemini(cv, profileYml, profileMd, sharedMd, report, questionText, fieldInfo) {
  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest'
  ];

  const prompt = `You are career-ops, an AI job application assistant.
Your task is to write a high-quality, professional, personalized answer to this job application form question.

CANDIDATE CV:
${cv}

CANDIDATE PROFILE:
${profileYml}
${profileMd}

ROLE EVALUATION REPORT:
${report}

SHARED INSTRUCTIONS & STYLE GUIDES:
${sharedMd}

QUESTION DETAILS:
- Question: "${questionText}"
- Field Type: ${fieldInfo.type}
- Options (if dropdown): ${JSON.stringify(fieldInfo.options)}
- Required: ${fieldInfo.required ? 'Yes' : 'No'}

OPERATING INSTRUCTIONS:
1. Write in the first person ("I").
2. Focus on being concise, specific, and outcomes-driven. Use proof points from the candidate's CV and report (e.g. patent, AskDISHA chatbot, Payoneer QA automation, global hackathon, sports/athlete background if relevant).
3. Do not exceed 200 words. Keep it punchy and professional.
4. If this is a question requiring personal preference/sponsorship/demographics (like visa sponsorship, salary expectations, self-identification), mark it with "Ask Candidate: [safe guideline response]". Do not invent these answers.
5. Provide ONLY the final answer text ready for copying and pasting. Do not include introductory text or chat.`;

  let responseText = '';
  let lastError = null;

  for (const currentModelName of candidateModels) {
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
        responseText = result.response.text().trim();
        success = true;
        break;
      } catch (err) {
        lastError = err;
        if (err.message.includes('503') || err.message.includes('Service Unavailable') || err.message.includes('high demand') || err.message.includes('429')) {
          console.log(`[${currentModelName}] Sleeping 3s due to API limit/load...`);
          await new Promise(r => setTimeout(r, 3000));
          attempt++;
        } else {
          break;
        }
      }
    }
    if (success) break;
  }

  return responseText || `[Drafting failed: ${lastError?.message || 'Unknown error'}]`;
}

async function draftReacherCustomNote(cv, profileYml, profileMd, sharedMd, report) {
  const prompt = `You are career-ops. Write a high-quality "AI-Native Developer Note" to answer Reacher's specific application question:
"Please send a short note about a complex problem you solved or a new skill you mastered specifically using an AI-driven workflow. GitHub/LinkedIn/resume is great, but we care more about how you think, build, and leverage AI. If you have examples of projects where AI coding tools were central to your workflow in the last 90 days, we'd love to see them."

CANDIDATE CV:
${cv}

CANDIDATE PROFILE:
${profileYml}
${profileMd}

ROLE EVALUATION REPORT:
${report}

Write in the first person ("I"), focus on the Payoneer AI QA Orchestration Platform and DSM Agent, keep it to 200-250 words, showing a deep understanding of Claude Code, MCP context engineering, and validation layers. Provide ONLY the note text.`;

  return draftAnswerWithGemini(cv, profileYml, profileMd, sharedMd, report, 'Reacher Custom AI Note', { type: 'textarea', required: true, options: [] }, prompt);
}

async function main() {
  const cv = readFile(PATHS.cv);
  const profileYml = readFile(PATHS.profileYml);
  const profileMd = readFile(PATHS.profile);
  const sharedMd = readFile(PATHS.shared);

  const targets = [
    {
      company: 'Reacher',
      role: 'Backend Software Engineer - India',
      url: 'https://jobs.ashbyhq.com/reacher/86a866da-dc3b-4d5d-ba94-599b642904ec',
      reportPath: 'reports/023-reacher-2026-06-24.md',
      score: '4.6/5'
    },
    {
      company: 'Glacis AI',
      role: 'Founding Software Engineer - Agentic AI (Remote)',
      url: 'https://jobs.ashbyhq.com/glacis-ai/feea2cb6-60db-4afa-8358-ba17d05d1cd5',
      reportPath: 'reports/030-glacis-2026-06-24.md',
      score: '4.6/5'
    },
    {
      company: 'Fermi AI',
      role: 'AI Engineer - MyRico',
      url: 'https://jobs.ashbyhq.com/Fermi%20AI/a4cf68d9-40c1-43f8-84cd-7ec262fc1bd6',
      reportPath: 'reports/025-meraki-labs-2026-06-24.md',
      score: '4.2/5'
    },
    {
      company: 'n8n',
      role: 'Sr Growth Engineer',
      url: 'https://jobs.ashbyhq.com/n8n/6a370ff8-e069-48ed-bffa-5716a3dbd9d5',
      reportPath: 'reports/026-n8n-2026-06-24.md',
      score: '4.2/5'
    },
    {
      company: 'n8n',
      role: 'Sr AI Engineer',
      url: 'https://jobs.ashbyhq.com/n8n/d195a389-6af5-4b95-82e5-2258953c7297',
      reportPath: 'reports/027-n8n-2026-06-24.md',
      score: '4.2/5'
    },
    {
      company: 'n8n',
      role: 'Community Software Engineer',
      url: 'https://jobs.ashbyhq.com/n8n/dd8e10d7-81ce-4b03-8ce3-f32c3423f33e',
      reportPath: 'reports/029-n8n-2026-06-24.md',
      score: '4.2/5'
    },
    {
      company: 'Hugging Face',
      role: 'Senior Python Software Engineer/Open-Source Contributor - EMEA Remote',
      url: 'https://apply.workable.com/huggingface/jobs/view/CB1DEFE6CE',
      reportPath: 'reports/032-hugging-face-2026-06-24.md',
      score: '4.2/5'
    }
  ];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await context.newPage();

  let finalMarkdown = `# Job Application Drafts

This document contains generated answers for your high-match applications from \`pipeline.md\`.

`;

  for (const t of targets) {
    console.log(`\n=== Processing ${t.company} — ${t.role} ===`);
    finalMarkdown += `---\n\n## ${t.company} — ${t.role}\n\n`;
    finalMarkdown += `* **URL:** [Apply Page](${t.url})\n`;
    finalMarkdown += `* **Match Score:** ${t.score}\n\n`;

    const report = readFile(t.reportPath);

    if (t.company === 'Reacher') {
      console.log('Generating Reacher custom note...');
      const reacherNote = await draftReacherCustomNote(cv, profileYml, profileMd, sharedMd, report);
      finalMarkdown += `### Required Custom Note:\n`;
      finalMarkdown += `> *Reacher asks to send a short note about a complex problem you solved specifically using an AI-driven workflow or projects where AI coding tools were central to your workflow in the last 90 days.*\n\n`;
      finalMarkdown += `**Draft Response:**\n> ${reacherNote.split('\n').join('\n> ')}\n\n`;
      continue;
    }

    try {
      const { fields, pageText } = await scrapeForm(page, t.url);

      if (fields.length === 0) {
        console.log('No custom fields detected.');
        finalMarkdown += `*No custom text questions detected on this application form. You only need to submit your standard information (Resume, LinkedIn, Name, Email).*\n\n`;
        continue;
      }

      console.log(`Found ${fields.length} custom fields.`);
      for (const field of fields) {
        console.log(`Drafting for question: "${field.label}"`);
        const draft = await draftAnswerWithGemini(cv, profileYml, profileMd, sharedMd, report, field.label, field);
        finalMarkdown += `### Question: ${field.label}\n`;
        if (field.required) finalMarkdown += `*Required*\n`;
        finalMarkdown += `\n> ${draft.split('\n').join('\n> ')}\n\n`;
      }

    } catch (err) {
      console.error(`Error processing ${t.company}: ${err.message}`);
      finalMarkdown += `❌ **Error scraping form:** ${err.message}\n\n`;
    }

    await page.waitForTimeout(3000);
  }

  await browser.close();

  writeFileSync(PATHS.outputFile, finalMarkdown, 'utf-8');
  console.log(`\nSuccess! All drafts written to ${PATHS.outputFile}`);
}

main().catch(console.error);
