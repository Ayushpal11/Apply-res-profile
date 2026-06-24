import { readFileSync, existsSync } from 'fs';

const PIPELINE_PATH = 'data/pipeline.md';

function main() {
  if (!existsSync(PIPELINE_PATH)) {
    console.error('pipeline.md not found');
    return;
  }

  const content = readFileSync(PIPELINE_PATH, 'utf-8');
  const lines = content.split('\n');

  const pendientesStart = lines.findIndex(l => l.trim().startsWith('## Pendientes'));
  if (pendientesStart === -1) {
    console.error('## Pendientes section not found');
    return;
  }

  const pendingLines = lines.slice(pendientesStart + 1);
  const matches = [];

  const juniorKeywords = [
    'junior', 'fresher', 'associate', 'graduate', 'grad', 'intern', 
    'sde i', 'sde 1', 'software engineer i', 'software engineer 1',
    'software developer i', 'software developer 1', 'engineer i', 'engineer 1',
    'entry', 'early', 'university', 'entry-level', 'early-career'
  ];

  for (const line of pendingLines) {
    if (line.trim().startsWith('- [ ]')) {
      const lowerLine = line.toLowerCase();
      // Extract title/role
      // Format is usually: - [ ] URL | Company | Title
      const parts = line.split('|');
      const company = parts[1] ? parts[1].trim() : 'Unknown';
      const title = parts[2] ? parts[2].trim() : 'Unknown';

      const isJuniorMatch = juniorKeywords.some(keyword => {
        // match exact word or phrase boundary to avoid false positives like "reinforcement learning"
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(title);
      });

      // Exclude obvious seniors even if they matched junior keywords somehow
      const hasSeniorKeywords = ['senior', 'sr.', 'sr ', 'lead', 'manager', 'staff', 'principal', 'director', 'head', 'architect'].some(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(title);
      });

      if (isJuniorMatch && !hasSeniorKeywords) {
        matches.push({
          line: line.trim(),
          company,
          title
        });
      }
    }
  }

  console.log(`Found ${matches.length} matching junior/fresher pending roles:`);
  console.log(JSON.stringify(matches, null, 2));
}

main();
