import { readFileSync, writeFileSync } from 'fs';

const PIPELINE_PATH = 'data/pipeline.md';

const originalPending = [
  '- [ ] https://jobs.ashbyhq.com/bland/681dfcda-f016-4bda-826e-7e813fae0083 | Bland AI | Machine Learning Researcher, Multimodal LLMs',
  '- [ ] https://jobs.ashbyhq.com/vapi/d270d613-30b8-4fdc-96e0-514993ca7a82 | Vapi | Member of Technical Staff, Backend',
  '- [ ] https://jobs.ashbyhq.com/vapi/941f5562-52f1-43f0-92d4-9d05931c0955 | Vapi | Member of Technical Staff,  Core Backend',
  '- [ ] https://jobs.ashbyhq.com/deepgram/39c2b79b-0269-4711-9354-be5ccf747a98 | Deepgram | Research Staff, LLMs',
  '- [ ] https://jobs.ashbyhq.com/deepgram/0796cc37-96a7-4158-8a00-155962da275a | Deepgram | Backend Software Engineer - Active Learning Team',
  '- [ ] https://jobs.ashbyhq.com/deepgram/68372d7d-b7a9-439e-a0a7-76690576aba4 | Deepgram | Software Engineer - Deepgram for Restaurants',
  '- [ ] https://jobs.ashbyhq.com/deepgram/7c7064bb-2bf0-4f64-81cc-14afe79a15c1 | Deepgram | Backend Software Engineer - Engine Team (Voice Agent)',
  '- [ ] https://jobs.ashbyhq.com/deepgram/4a873ede-8555-42ae-9ddc-ac89afdd7278 | Deepgram | Software Engineer, Voice Agents / AI - Deepgram for Restaurants',
  '- [ ] https://jobs.ashbyhq.com/deepgram/378e83b4-28c0-4b4e-8cf0-9355712bd06d | Deepgram | Billing & Analytics Software Engineer',
  '',
  '- [ ] https://job-boards.greenhouse.io/anthropic/jobs/5270442008 | Anthropic | Software Engineer, Identity & Access Controls',
  '- [ ] https://job-boards.greenhouse.io/arizeai/jobs/6030953004 | Arize AI | Forward Deployed AI Engineer, West',
  '- [ ] https://boomi.com/boomi-jobs/?gh_jid=5617156004 | Boomi | Software Principal Engineer - Bangalore (JAVA Backend Architecture)',
  '- [ ] https://jobs.ashbyhq.com/faculty/4aad6acf-ec5a-45f4-99d4-1a36966fdd06 | Faculty | Lead Software Engineer',
  '',
  '- [ ] https://jobs.ashbyhq.com/emergence/c72a7952-5d8a-4b2e-b0b2-0e349152fefd | emergence | SDE I',
  '- [ ] https://jobs.ashbyhq.com/emergence/d91a1451-a6a4-46b5-9b92-04d38e0062da | emergence | Senior AI Engineer',
  '- [ ] https://jobs.ashbyhq.com/Pulsora%20Inc/94d2db5c-8e55-48ec-ad52-738691a34924 | Pulsora%20Inc | AI Engineer - India',
  '- [ ] https://jobs.ashbyhq.com/soulside%20ai/041401b5-bd04-4c78-aff4-4b713c3627ae | soulside%20ai | Backend Engineer (India/Remote)',
  '- [ ] https://jobs.ashbyhq.com/outmarket/716e3319-1d72-4f8d-b5d9-efb9de1cf72f | outmarket | Full Stack AI Engineer'
];

let text = readFileSync(PIPELINE_PATH, 'utf-8');
const lines = text.split('\n');

const pendingStart = lines.findIndex(l => l.trim().startsWith('## Pending') || l.trim().startsWith('## Pendientes'));
const processedStart = lines.findIndex(l => l.trim().startsWith('## Processed') || l.trim().startsWith('## Procesadas'));

if (pendingStart === -1 || processedStart === -1) {
  console.error('Pending or Processed section not found!');
  process.exit(1);
}

// Replace the lines between pendingStart and processedStart with the original ones
lines.splice(pendingStart + 1, processedStart - pendingStart - 1, ...originalPending);

writeFileSync(PIPELINE_PATH, lines.join('\n'), 'utf-8');
console.log('Successfully restored data/pipeline.md');
