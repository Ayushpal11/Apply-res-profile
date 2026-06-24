import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';

const REPORTS_DIR = 'reports';

function main() {
  if (!existsSync(REPORTS_DIR)) {
    console.error('Reports directory not found.');
    process.exit(1);
  }

  const files = readdirSync(REPORTS_DIR).filter(f => f.endsWith('.md'));
  const results = [];

  for (const file of files) {
    const filePath = path.join(REPORTS_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    const lowerContent = content.toLowerCase();

    // Parse metadata
    const reportNumMatch = file.match(/^(\d{3})/);
    const reportNum = reportNumMatch ? reportNumMatch[1] : '???';

    const scoreMatch = content.match(/\*\*Score:\*\*\s*([0-9.]+\/5)/i) || content.match(/SCORE:\s*([0-9.]+)/i);
    const score = scoreMatch ? scoreMatch[1] : '?/5';

    const companyMatch = content.match(/# Evaluation:\s*([^-#\n]+)/i) || content.match(/COMPANY:\s*(.+)/i);
    const company = companyMatch ? companyMatch[1].trim().split('—')[0].trim() : 'Unknown';

    const roleMatch = content.match(/# Evaluation:\s*.*?—\s*(.+)/i) || content.match(/ROLE:\s*(.+)/i);
    const role = roleMatch ? roleMatch[1].trim().split('\n')[0].trim() : 'Unknown';

    // Parse Seniority and Remote from the table
    const seniorityMatch = content.match(/\|\s*\*\*Seniority\*\*\s*\|\s*([^|\n]+)/i) || content.match(/\|\s*Seniority\s*\|\s*([^|\n]+)/i);
    const seniority = seniorityMatch ? seniorityMatch[1].trim() : 'Unknown';

    const remoteMatch = content.match(/\|\s*\*\*Remote\*\*\s*\|\s*([^|\n]+)/i) || content.match(/\|\s*Remote\s*\|\s*([^|\n]+)/i);
    const remote = remoteMatch ? remoteMatch[1].trim() : 'Unknown';

    // Check URL
    const urlMatch = content.match(/\*\*URL:\*\*\s*(.+)/i);
    const url = urlMatch ? urlMatch[1].trim() : 'N/A';

    // 1. Geography Check: Indian candidate eligibility
    // Must be in India, or remote (excluding timezone or country restricted like US only, Europe only)
    const isRemoteIndiaOrGlobal = 
      remote.toLowerCase().includes('india') || 
      remote.toLowerCase().includes('global') || 
      remote.toLowerCase().includes('worldwide') || 
      remote.toLowerCase().includes('anywhere') ||
      (remote.toLowerCase().includes('yes') && 
       !remote.toLowerCase().includes('us remote') && 
       !remote.toLowerCase().includes('us only') && 
       !remote.toLowerCase().includes('europe') && 
       !remote.toLowerCase().includes('canada'));

    const isOnsiteIndia = 
      remote.toLowerCase().includes('bangalore') || 
      remote.toLowerCase().includes('bengaluru') || 
      remote.toLowerCase().includes('gurugram') || 
      remote.toLowerCase().includes('gurgaon') || 
      remote.toLowerCase().includes('noida') || 
      remote.toLowerCase().includes('delhi') ||
      lowerContent.includes('bangalore') ||
      lowerContent.includes('bengaluru') ||
      lowerContent.includes('gurugram');

    const isIndiaEligible = isRemoteIndiaOrGlobal || isOnsiteIndia;

    // 2. Experience Check: Strict fresher/junior (excluding Senior, Lead, Staff, Principal, Manager, Founding, MTS, or YOE >= 3)
    const hasSeniorKeywords = 
      role.toLowerCase().includes('senior') || 
      role.toLowerCase().includes('sr') || 
      role.toLowerCase().includes('lead') || 
      role.toLowerCase().includes('manager') || 
      role.toLowerCase().includes('staff') || 
      role.toLowerCase().includes('principal') || 
      role.toLowerCase().includes('founding') || 
      role.toLowerCase().includes('director') || 
      role.toLowerCase().includes('head') || 
      role.toLowerCase().includes('architect') ||
      seniority.toLowerCase().includes('senior') || 
      seniority.toLowerCase().includes('lead') || 
      seniority.toLowerCase().includes('staff') || 
      seniority.toLowerCase().includes('manager') || 
      seniority.toLowerCase().includes('principal') || 
      seniority.toLowerCase().includes('founding') || 
      seniority.toLowerCase().includes('director');

    // Parse YOE mentions (e.g., 3+ years, 5+ years, 3-5 years) in both seniority and match sections
    // If it requires >= 3 years, exclude it, since the user has slightly over 1 YOE.
    let requiresHighYoe = false;
    const yoeRegex = /(\d+)\s*\+?\s*-\s*(\d+)\s*years?|(\d+)\s*\+\s*years?/gi;
    let match;
    const searchString = (seniority + ' ' + content.slice(0, 3000)).toLowerCase();
    while ((match = yoeRegex.exec(searchString)) !== null) {
      const minYears = parseInt(match[1] || match[3]);
      if (minYears >= 3) {
        requiresHighYoe = true;
        break;
      }
    }

    const isJuniorOrFresher = !hasSeniorKeywords && !requiresHighYoe;

    // We also want to capture the status of the job if it's active
    // If score is >= 4.0, it is a high-match role
    const numericScore = parseFloat(score);

    results.push({
      num: reportNum,
      file: file,
      company: company,
      role: role,
      score: score,
      numericScore: numericScore,
      seniority: seniority,
      remote: remote,
      url: url,
      isIndiaEligible,
      isJuniorOrFresher,
      reason: hasSeniorKeywords ? 'Senior keywords' : (requiresHighYoe ? 'Requires >=3 YOE' : 'Fit')
    });
  }

  // Filter the results
  const eligibleRoles = results.filter(r => r.isIndiaEligible && r.isJuniorOrFresher && r.numericScore >= 4.0);

  // Sort by score descending
  eligibleRoles.sort((a, b) => b.numericScore - a.numericScore);

  console.log('JSON_OUTPUT_START');
  console.log(JSON.stringify(eligibleRoles, null, 2));
  console.log('JSON_OUTPUT_END');

  console.log('\n--- DEBUG LOG OF ALL REPORTS ---');
  results.forEach(r => {
    console.log(`[#${r.num}] ${r.company} - ${r.role} (Score: ${r.score})`);
    console.log(`  - India Eligible: ${r.isIndiaEligible} (Remote: "${r.remote}")`);
    console.log(`  - Junior/Fresher: ${r.isJuniorOrFresher} (Reason: ${r.reason}, Seniority: "${r.seniority}")`);
    console.log(`  - Final Status: ${r.isIndiaEligible && r.isJuniorOrFresher && r.numericScore >= 4.0 ? 'ELIGIBLE' : 'EXCLUDED'}`);
  });
}

main();
