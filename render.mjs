import { renderHtmlToPdf } from './generate-pdf.mjs';
import { resolve } from 'path';
import { readFile } from 'fs/promises';

async function run() {
  const input = resolve(process.argv[2]);
  const output = resolve(process.argv[3]);
  const html = await readFile(input, 'utf-8');
  await renderHtmlToPdf(html, output, { format: 'a4', baseDir: resolve('.') });
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
