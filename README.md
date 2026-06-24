# Career-Ops — AI Job Search Pipeline

<p align="center">
  <img src="docs/hero-banner.jpg" alt="Career-Ops Multi-Agent Job Search System" width="800">
</p>

<p align="center">
  <strong>An AI-powered, CLI-agnostic job search automation pipeline customized for early-career Backend & AI Engineering roles in India.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Antigravity_CLI-4285F4?style=flat&logo=google&logoColor=white" alt="Antigravity CLI">
  <img src="https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white" alt="Claude Code">
  <img src="https://img.shields.io/badge/OpenCode-111827?style=flat&logo=terminal&logoColor=white" alt="OpenCode">
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white" alt="Playwright">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT">
</p>

---

## 💡 Origin & Credits

This repository is a personalized fork and active workspace built on top of the original open-source **[career-ops](https://github.com/santifer/career-ops)** system engineered by **[Santiago (santifer)](https://santifer.io)**. 

The original tool was built by Santiago to evaluate 740+ job offers, generate 100+ tailored CVs, and land a Head of Applied AI role. This version has been adapted and configured specifically for **Ayush Pal**'s job search targeting:
* **Target Roles:** Backend Engineer & AI/ML Engineer
* **Experience Level:** Junior/Mid (fresher / 1–2 YOE)
* **Geographic Focus:** India (Remote or Bangalore/NCR region)

---

## 🚀 Key Features

* **Auto-Evaluation:** Paste any job URL or JD description to get a comprehensive 6-block analysis (CV match, level strategy, comp research, and STAR interview story alignments).
* **Location & Experience Guardrails:** Custom filtering via [find-eligible.js](file:///c:/Users/ayush/Documents/career-ops/scratch/find-eligible.js) to isolate roles matching India working criteria and strict junior/fresher YOE limits (excluding senior/lead/founding roles).
* **ATS-Optimized PDF Generator:** Seamlessly compiles customized, keyword-injected CVs using Playwright/Chromium.
* **Portal Scanner:** Hits Greenhouse, Ashby, and Lever APIs directly to discover active roles before they are flooded with applicants.
* **Pipeline Integrity:** Automated status normalization, deduplication, and database health checks to avoid duplicate entries.

---

## 🛠️ Personalization Architecture

Following the system guidelines, personalization parameters are isolated from core system code to ensure updatability:
* **Candidate Metadata:** Configured in [config/profile.yml](file:///c:/Users/ayush/Documents/career-ops/config/profile.yml) (includes target roles, superpowers, exiting narrative, and compensation requirements).
* **Custom Archetypes & Prompts:** Written to [modes/_profile.md](file:///c:/Users/ayush/Documents/career-ops/modes/_profile.md) (not to shared system modes).
* **Canonical Resume Source:** Maintained in markdown format at `cv.md` in the project root.

---

## 💻 Quick Start & Commands

To get details of the CLI commands or run scans, use the following tools:

### Unified Command Center
```bash
# Evaluate a job description from clipboard or text
/career-ops "Job description here..."

# Process pending URLs in pipeline
/career-ops pipeline

# Scan job boards & portals
/career-ops scan

# Compile a customized resume to PDF
/career-ops pdf
```

### Manual Scripts
```bash
# Check setup health & doctor prerequisites
node doctor.mjs

# Run the target job filter for India junior/fresher roles
node scratch/find-eligible.js

# Verify the pipeline database consistency
node verify-pipeline.mjs
```

---

## 📂 Project Structure

* **`cv.md`** — The canonical CV source of truth.
* **`config/profile.yml`** — Candidate configurations and target preferences.
* **`data/applications.md`** — The main applications tracking table.
* **`data/pipeline.md`** — The incoming inbox for pending job descriptions.
* **`reports/`** — Evaluation outputs for each job.
* **`scratch/`** — Custom workspace scripts (e.g. filters, draft helpers, test scripts).
* **`templates/`** — Base HTML/LaTeX templates and states definitions.

---

## 🤝 Support the Original Project
If you find this pipeline framework helpful, check out the original creator's repositories:
* **System Engine:** [santifer/career-ops](https://github.com/santifer/career-ops)
* **Portfolio Template:** [santifer/cv-santiago](https://github.com/santifer/cv-santiago)
* **Author's Website:** [santifer.io](https://santifer.io)

---
*MIT License — Created for personal productivity and professional development.*
