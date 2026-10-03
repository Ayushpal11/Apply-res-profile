# Custom Instructions -- career-ops

<!-- ============================================================
     THIS FILE IS YOURS. It will NEVER be auto-updated.

     Put your own house rules, custom workflows, and automations
     here -- anything you want the agent to ALWAYS do (or never do).

     This is for PROCEDURAL rules ("HOW I want things done").
     For WHO you are (archetypes, narrative, comp, negotiation),
     use modes/_profile.md instead. Keeping the two separate keeps
     each one readable.

     The agent reads this file alongside the system instructions;
     your rules here take precedence over the defaults, as long as
     they don't break the Data Contract (your files are never
     touched, and we never auto-submit an application for you).

     Because this is a user-layer file, anything you write here
     survives `node update-system.mjs`. Put customizations HERE,
     not in CLAUDE.md / modes/_shared.md / other system files --
     those get overwritten on update.
     ============================================================ -->

## House Rules

- Never include a photo in my CV (US / India / ATS-first markets).

## Custom Workflows

- **apply-autofill**: For any application that the user chooses to apply to, the agent should:
  1. Generate the tailored CV HTML and PDF for the role using `build-cv-html.mjs` and `generate-pdf.mjs` (using `--allow-reorder` if needed), and copy the PDF to the user's `Downloads` directory for easy uploading.
  2. Launch the Playwright browser subagent (`browser_subagent`) to automatically navigate to the application portal and fill out all form inputs (First Name, Last Name, Email, Phone, Location, Education, Custom/Disclosures Questions) based on the candidate's profile/CV.
  3. Keep the page open and report back with confirmation so the candidate can upload the resume from their `Downloads` folder and submit.

## Output Preferences

(none yet -- add yours above)
