import { writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const candidate = {
  name: "Ayush Pal",
  phone: "+91 9548165996",
  email: "ayushpal74553@gmail.com",
  linkedin: { url: "https://linkedin.com/in/ayushpal11", display: "linkedin.com/in/ayushpal11" },
  portfolio: { url: "https://github.com/Ayushpal11", display: "github.com/Ayushpal11" },
  location: "Gurugram, Haryana, India"
};

const education = [
  {
    title: "Credit-Linked Program in Artificial Intelligence & Machine Learning",
    org: "Daksh Gurukul – IIT Guwahati (Remote)",
    year: "2025 - 2026",
    description: "GPA: 9.46"
  },
  {
    title: "B.Tech in Computer Science & Engineering",
    org: "Vellore Institute of Technology",
    year: "2021 - 2025",
    description: "CGPA: 8.18"
  }
];

const projects = [
  {
    name: "DSM Agent — Enterprise AI Scrum Automation",
    badge: "AI & Automation",
    tech: "Next.js, Mistral AI, Prisma, NeonDB, Docker",
    description: "Engineered automated standup generation pipelines with live Jira API ingestion and secure multi-role RBAC on Neon PostgreSQL."
  },
  {
    name: "Enterprise RAG Platform",
    badge: "AI Infrastructure",
    tech: "Python, FastAPI, LangChain, ChromaDB, Docker",
    description: "Built vector-search infrastructure using ChromaDB and Sentence Transformers for semantic retrieval with grounded source attribution."
  },
  {
    name: "Ask PDF — Document AI Query System",
    badge: "REST APIs",
    tech: "FastAPI, LangChain, Hugging Face, ChromaDB, React",
    description: "Engineered hybrid retrieval pipeline combining BoW citation matching with vector embeddings for document query resolution."
  }
];

const certifications = [
  {
    title: "Hybrid Intrusion Detection System Patent (IP India)",
    org: "Co-Inventor",
    year: "2026"
  },
  {
    title: "GAN-enhanced DDoS detection model for IoMT Security",
    org: "IEEE Publication (ICICKE)",
    year: "2025"
  },
  {
    title: "3rd Place – Payoneer Global Hackathon",
    org: "RAG & Azure compliance platform",
    year: "2025"
  },
  {
    title: "Ethical Hacking Essentials (EHE v1)",
    org: "EC-Council",
    year: ""
  }
];

const jobsData = [
  {
    company: "glacis",
    reportNum: "030",
    summary: "Backend & Agentic Automation Engineer with hands-on experience deploying LLM orchestration workflows, autonomous QA platforms, and distributed APIs. Skilled in Python, TypeScript, and vector search infrastructure, with a strong focus on enterprise logistics and high-ownership engineering.",
    competencies: ["Agentic Workflows", "LLM Orchestration", "FastAPI & Python Backend", "Logistics & Workflow Automation", "ChromaDB & Vector Search", "CI/CD & Containerization"],
    bulletsPayoneer: [
      "Architected an AI-driven QA orchestration platform supporting autonomous test planning and commit-aware impact analysis.",
      "Built and scaled test automation infrastructure using Java, Playwright, and Maven; engineered Allure + Gatling reporting pipelines.",
      "Designed API validation and transaction integrity pipelines for distributed payment systems."
    ],
    bulletsCris: [
      "Co-developed and deployed AskDISHA 2.0, a production-grade conversational AI chatbot for IRCTC using Node.js, Express.js, and React.js."
    ],
    skills: [
      { category: "Languages", items: ["Python", "TypeScript", "JavaScript", "Java", "SQL"] },
      { category: "Backend & AI", items: ["FastAPI", "Node.js", "LangChain", "ChromaDB", "Vector Search"] },
      { category: "Tools & Cloud", items: ["Docker", "GitHub Actions", "CI/CD", "PostgreSQL", "Prisma"] }
    ]
  },
  {
    company: "n8n",
    reportNum: "029",
    summary: "Backend & Integration Engineer specializing in workflow automation, developer enablement, and API integrations. Skilled in TypeScript, Node.js, and custom node development, with a strong focus on community engineering and scalable integration pipelines.",
    competencies: ["n8n Integrations & Nodes", "Workflow Automation", "TypeScript & Node.js", "REST APIs & WebSockets", "Developer Enablement", "Prisma & Neon PostgreSQL"],
    bulletsPayoneer: [
      "Architected an AI-driven QA orchestration platform supporting autonomous test planning and context-aware Playwright MCP integrations.",
      "Engineered automated commit-based service detection and automated test case generation using Java and Playwright.",
      "Designed secure multi-role RBAC architectures and automated cron synchronization pipelines for enterprise workflows."
    ],
    bulletsCris: [
      "Co-developed and deployed AskDISHA 2.0 conversational chatbot for IRCTC using Node.js, Express.js, and React.js, serving millions of active users."
    ],
    skills: [
      { category: "Languages", items: ["TypeScript", "JavaScript", "Python", "Java", "SQL"] },
      { category: "Frameworks & APIs", items: ["Node.js", "Express.js", "FastAPI", "React.js", "Next.js"] },
      { category: "Databases & Tools", items: ["PostgreSQL", "Prisma", "ChromaDB", "Docker", "GitHub Actions"] }
    ]
  },
  {
    company: "sarvam-ai",
    reportNum: "003",
    summary: "AI & Backend Engineer specializing in LLM evaluations, RAG pipelines, and model benchmarking. Experienced in vector databases, semantic search optimization, and building robust testing infrastructure for conversational AI systems.",
    competencies: ["LLM Evaluations & Benchmarking", "RAG Pipelines & Vector DBs", "Hugging Face & LangChain", "ChromaDB & Sentence Transformers", "Python & FastAPI Backend", "Conversational AI Systems"],
    bulletsPayoneer: [
      "Architected an AI-driven QA platform supporting autonomous test planning, benchmark evaluations, and MCP-integrated LLM retrieval.",
      "Built and scaled test automation infrastructure using Java, Playwright, and Maven; engineered Allure + Gatling reporting pipelines.",
      "Designed API validation and transaction integrity pipelines for distributed systems."
    ],
    bulletsCris: [
      "Co-developed and deployed AskDISHA 2.0, a production-grade conversational AI chatbot for IRCTC serving millions of active users."
    ],
    skills: [
      { category: "Languages", items: ["Python", "TypeScript", "JavaScript", "Java", "SQL"] },
      { category: "AI & Vector Search", items: ["LLMs", "RAG", "LangChain", "ChromaDB", "Transformers", "Evals"] },
      { category: "Backend & Cloud", items: ["FastAPI", "Node.js", "PostgreSQL", "Docker", "GitHub Actions"] }
    ]
  },
  {
    company: "abb",
    reportNum: "042",
    summary: "Software Development & Automation Engineer specializing in UI/API test framework design and CI/CD integration. Skilled in TypeScript, Playwright, and Java, with a strong focus on performance testing, containerization, and enterprise automation.",
    competencies: ["Test Automation Frameworks", "Playwright & TS/JS", "API Test Development", "CI/CD & Containerization", "Performance Testing (Gatling)", "Azure & Docker Environments"],
    bulletsPayoneer: [
      "Architected an AI-driven QA orchestration platform using Playwright, Java, and Maven, optimizing test planning and delivery speeds.",
      "Designed and implemented high-performance API validation and transaction integrity pipelines; built containerized CI/CD environments via Docker.",
      "Experienced with Azure Foundry via Payoneer Global Hackathon (3rd Place); managed database migrations and analytics workflows."
    ],
    bulletsCris: [
      "Co-developed and deployed AskDISHA 2.0, a production-grade conversational AI chatbot for IRCTC using Node.js, Express.js, and React.js."
    ],
    skills: [
      { category: "Languages", items: ["TypeScript", "JavaScript", "Python", "Java", "SQL"] },
      { category: "Testing & DevOps", items: ["Playwright", "Gatling", "Allure", "Docker", "GitHub Actions", "Azure"] },
      { category: "Backend Frameworks", items: ["Node.js", "Express.js", "FastAPI", "React.js", "Prisma"] }
    ]
  }
];

jobsData.forEach(job => {
  const payload = {
    lang: "en",
    page_format: "a4",
    candidate,
    summary: job.summary,
    competencies: job.competencies,
    experience: [
      {
        company: "Payoneer",
        role: "Software Engineer – Backend Infrastructure & Automation",
        location: "Gurugram, Haryana",
        dates: "May 2025 - Present",
        bullets: job.bulletsPayoneer
      },
      {
        company: "Centre for Railway Information Systems (CRIS)",
        role: "Software Development Intern",
        location: "New Delhi, India",
        dates: "Aug 2023 - Sep 2023",
        bullets: job.bulletsCris
      }
    ],
    projects,
    education,
    certifications,
    skills: job.skills
  };

  const jsonPath = `scratch/cv-${job.company}.json`;
  const htmlPath = `output/cv-ayush-pal-${job.company}.html`;
  const pdfPath = `output/cv-ayush-pal-${job.company}.pdf`;

  writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`\n--- Tailoring CV for ${job.company.toUpperCase()} ---`);

  // Build HTML
  try {
    execSync(`node build-cv-html.mjs ${jsonPath} ${htmlPath}`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`HTML generation failed for ${job.company}: ${err.message}`);
    return;
  }

  // Generate PDF
  try {
    execSync(`node generate-pdf.mjs ${htmlPath} ${pdfPath} --format=a4 --report=${job.reportNum} --allow-reorder`, { stdio: 'inherit' });
    // Copy to Downloads
    const copyDst = `C:/Users/ayush/Downloads/cv-ayush-pal-${job.company}.pdf`;
    const fs = await import('fs');
    fs.copyFileSync(pdfPath, copyDst);
    console.log(`Copied PDF to Downloads: ${copyDst}`);
  } catch (err) {
    console.error(`PDF generation failed for ${job.company}: ${err.message}`);
  }
});

console.log("\nAll tailored resumes compiled successfully!");
