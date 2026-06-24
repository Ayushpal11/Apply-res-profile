import { readFileSync, existsSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
  console.error('Error: GEMINI_API_KEY not found in environment or .env file.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const PATHS = {
  cv: 'cv.md',
  profile: 'modes/_profile.md',
  profileYml: 'config/profile.yml',
  shared: 'modes/_shared.md',
  applyMode: 'modes/apply.md',
  outputFile: 'scratch/application-drafts.md',
};

function readFile(filePath) {
  if (existsSync(filePath)) {
    return readFileSync(filePath, 'utf-8').trim();
  }
  return '';
}

// Scrape fields from Ashby job posting page
async function scrapeAshbyForm(page, url) {
  console.log(`Scraping form questions from: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait a bit to ensure all components / forms render
  await page.waitForTimeout(3000);

  const fields = await page.evaluate(() => {
    const results = [];
    
    // Find all custom questions or standard inputs
    // Ashby form fields typically are inside containers with classes containing form-field or similar.
    // Or labeled by <label> tags.
    const labelElements = Array.from(document.querySelectorAll('label'));
    const processedInputs = new Set();

    for (const label of labelElements) {
      const labelText = label.innerText?.replace(/\s+/g, ' ').trim() || '';
      if (!labelText) continue;

      // Skip generic standard fields like Resume, Name, Email, Phone, LinkedIn, Website, etc.
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

        results.push({
          label: labelText,
          type,
          required,
          options
        });
      }
    }

    // Fallback search if no form labels are mapped
    if (results.length === 0) {
      const textareas = Array.from(document.querySelectorAll('textarea'));
      for (const ta of textareas) {
        const parentText = ta.parentElement?.innerText?.split('\n')[0]?.trim() || '';
        if (parentText && !processedInputs.has(ta)) {
          results.push({
            label: parentText,
            type: 'textarea',
            required: ta.hasAttribute('required'),
            options: []
          });
        }
      }
    }

    return results;
  });

  return fields;
}

async function draftAnswerWithGemini(cv, profileYml, profileMd, sharedMd, report, questionText, fieldInfo) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
  });

  const prompt = `You are career-ops, an AI job application assistant.
Your task is to write a high-quality, professional, personalized answer to a specific job application form question.

CANDIDATE CV:
${cv}

CANDIDATE NARRATIVE & PROFILE:
${profileYml}
${profileMd}

ROLE EVALUATION REPORT:
${report}

SHARED INSTRUCTIONS & STYLE GUIDES:
${sharedMd}

APPLICATION FIELD INFORMATION:
- Question: "${questionText}"
- Field Type: ${fieldInfo.type}
- Options (if dropdown): ${JSON.stringify(fieldInfo.options)}
- Required: ${fieldInfo.required ? 'Yes' : 'No'}

OPERATING INSTRUCTIONS:
1. Focus on being concise, specific, and outcomes-driven. Use proof points from the candidate's CV and report (e.g. patent, IRCTC AskDISHA chatbot, Payoneer QA automation, global hackathon, sports/athlete background if relevant).
2. Write in the first person ("I").
3. DO NOT exceed typical length for such inputs (around 150-250 words maximum for essay/textarea questions, or shorter for text fields).
4. If this is a question requiring personal preference/sponsorship/demographics (like visa sponsorship, salary expectations, self-identification), mark it with "Ask Candidate: [safe guideline response]". Do not invent these answers.
5. Provide ONLY the final answer text ready for copying and pasting. Do not include introductory text like "Here is your response:" or conversational chatter. Output just the clean answer text.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error(`Gemini call failed for question: "${questionText}" - ${err.message}`);
    return `[Draft generation failed: ${err.message}]`;
  }
}

async function main() {
  const cv = readFile(PATHS.cv);
  const profileYml = readFile(PATHS.profileYml);
  const profileMd = readFile(PATHS.profile);
  const sharedMd = readFile(PATHS.shared);
  const applyMode = readFile(PATHS.applyMode);

  const targets = [
    {
      company: 'Reacher',
      role: 'Backend Software Engineer - India',
      url: 'https://jobs.ashbyhq.com/reacher/86a866da-dc3b-4d5d-ba94-599b642904ec',
      reportPath: 'reports/023-reacher-2026-06-24.md',
      score: '4.6'
    },
    {
      company: 'Fermi AI',
      role: 'AI Engineer - MyRico',
      url: 'https://jobs.ashbyhq.com/Fermi%20AI/a4cf68d9-40c1-43f8-84cd-7ec262fc1bd6',
      reportPath: 'reports/025-meraki-labs-2026-06-24.md',
      score: '4.2'
    }
  ];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await context.newPage();

  let finalMarkdown = `# Job Application Drafts

This document contains generated answers for your high-match applications from ` + "`pipeline.md`" + `.

`;

  for (const t of targets) {
    console.log(`\n=== Processing ${t.company} — ${t.role} ===`);
    finalMarkdown += `## ${t.company} — ${t.role}\n\n`;
    finalMarkdown += `* **URL:** [Apply Page](${t.url})\n`;
    finalMarkdown += `* **Match Score:** ${t.score}/5\n\n`;

    const report = readFile(t.reportPath);
    
    try {
      const fields = await scrapeAshbyForm(page, t.url);
      
      if (fields.length === 0) {
        console.log(`No custom questions detected on the form (only standard fields).`);
        finalMarkdown += `*No custom text questions detected on this application form. Only standard fields (Resume, LinkedIn, Name, Email) are present.*\n\n`;
        continue;
      }

      console.log(`Found ${fields.length} custom fields to draft answers for.`);
      
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

    await page.waitForTimeout(2000);
  }

  await browser.close();

  writeFileSync(PATHS.outputFile, finalMarkdown, 'utf-8');
  console.log(`\nSuccess! Application drafts saved to ${PATHS.outputFile}`);
}

main().catch(console.error);
