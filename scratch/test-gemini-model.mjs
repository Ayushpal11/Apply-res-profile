import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, existsSync } from 'fs';

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

async function testModel(modelName) {
  console.log(`Testing model: ${modelName}`);
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Hello! What is your model name?");
    console.log(`Success for ${modelName}: ${result.response.text().trim().substring(0, 100)}`);
    return true;
  } catch (err) {
    console.error(`Failed for ${modelName}:`, err.message);
    return false;
  }
}

async function main() {
  const models = [
    'gemini-2.0-flash-lite',
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-1.5-flash-latest', // Let's try this just in case
    'gemini-1.5-pro-latest'
  ];
  for (const m of models) {
    await testModel(m);
  }
}

main();
