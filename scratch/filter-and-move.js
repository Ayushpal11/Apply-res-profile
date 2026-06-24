import { readFileSync, writeFileSync, existsSync } from 'fs';

const PIPELINE_PATH = 'data/pipeline.md';

function main() {
  if (!existsSync(PIPELINE_PATH)) {
    console.error('Error: pipeline.md not found.');
    process.exit(1);
  }

  let text = readFileSync(PIPELINE_PATH, 'utf-8');
  const lines = text.split('\n');

  const pendingSectionStart = lines.findIndex(l => l.trim().startsWith('## Pending'));
  const processedSectionStart = lines.findIndex(l => l.trim().startsWith('## Processed'));
  const pendientesSectionStart = lines.findIndex(l => l.trim().startsWith('## Pendientes'));

  if (pendingSectionStart === -1 || processedSectionStart === -1 || pendientesSectionStart === -1) {
    console.error('Could not find all sections in pipeline.md.');
    process.exit(1);
  }

  const pendedLines = lines.slice(pendientesSectionStart + 1);
  const targetLines = [];
  const remainingPendientes = [];

  for (const line of pendedLines) {
    const clean = line.trim();
    if (clean.startsWith('- [ ]')) {
      const lower = clean.toLowerCase();
      // Target: Glacis AI, n8n, Hugging Face
      if (lower.includes('glacis-ai') || lower.includes('n8n') || lower.includes('huggingface')) {
        targetLines.push(line);
        continue;
      }
    }
    remainingPendientes.push(line);
  }

  if (targetLines.length === 0) {
    console.log('No matching remote roles found in the Pendientes section.');
    return;
  }

  console.log(`Moving ${targetLines.length} roles:`);
  targetLines.forEach(l => console.log(`  • ${l}`));

  // Construct new file content
  const activePendingContent = lines.slice(pendingSectionStart + 1, processedSectionStart);
  const processedContent = lines.slice(processedSectionStart + 1, pendientesSectionStart);

  const newLines = [
    ...lines.slice(0, pendingSectionStart + 1),
    ...targetLines,
    ...activePendingContent,
    '## Processed',
    ...processedContent,
    '## Pendientes',
    ...remainingPendientes
  ];

  writeFileSync(PIPELINE_PATH, newLines.join('\n'), 'utf-8');
  console.log('\nSuccessfully rearranged pipeline.md.');
}

main();
