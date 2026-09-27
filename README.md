# Trustworthy AI (TAI) Assessment System — Frontend

[![Next.js](https://img.shields.io/badge/Next.js-15_(App_Router)-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.0-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20ZH--TW-orange)](#-localized-experience)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An interdisciplinary software engineering platform engineered to audit, quantify, and visualize machine learning system trustworthiness across **11 core TAI dimensions**. Developed under the **TAI Trustworthy AI Lab** in collaboration with domain experts from the Departments of Law and Political Science to bridge regulatory governance policies with algorithmic assessment metrics.


## 🎬 System Demonstration & Documentation

| 📺 Video Demonstration | 📑 Technical Presentation |
| :--- | :--- |
| [![Watch the Demo](https://img.youtube.com/vi/jxtBbBmE0rw/hqdefault.jpg)](https://www.youtube.com/watch?v=jxtBbBmE0rw) | <br> **Trustworthy AI Assessment System** <br> *Comprehensive Architecture, Governance & Evaluation Report* <br><br> [![Download PDF](https://img.shields.io/badge/View_Presentation-PDF-red?style=for-the-badge&logo=adobe-acrobat-reader&logoColor=white)](docs/FinalProjectPresentation.pdf) |
| **Platform Walkthrough:** End-to-end audit demonstration covering indicator prioritization, questionnaire flows, and radar chart generation. | **System Architecture Report:** Interdisciplinary legal/policy frameworks, scoring rubrics, and campus deployment specifications. |


## 🌟 Core System Architecture

```
[ Auditor / Domain Practitioner ]
                │
                ▼
[ Interactive Next.js 15 Web Portal ] (This Repository)
    ├── Multilingual App Router Architecture (EN / ZH-TW)
    ├── Drag-and-Drop Indicator Prioritization Engine (`/tai_sort`)
    ├── Tri-Stage Lifecycle Questionnaire Pipeline (Pre / Mid / Post Modeling)
    └── Dynamic Radar Chart & Risk Report Engine (Chart.js)
                │
                ▼ (Asynchronous REST API / JSON Payloads)
[ TAI Lab Backend & Scoring Engine ] (`http://localhost:3001`)
```

## 🎯 Evaluation Methodology & 11 TAI Dimensions

The platform operationalizes AI governance across the entire modeling lifecycle:

* **Lifecycle Coverage:**
  * **Pre-modeling:** Assesses training data integrity, legal provenance, representation bias, and privacy guarantees.
  * **Mid-modeling:** Audits hyperparameter stability, feature selection transparency, and training resilience.
  * **Post-modeling:** Quantifies inference explainability, adversarial robustness, accountability structures, and accuracy metrics.
* **11 Core TAI Pillars:**
  `Accuracy` • `Reliability` • `Safety` • `Resilience` • `Transparency` • `Accountability` • `Explainability` • `Autonomy` • `Privacy` • `Fairness` • `Security`


## 🚀 Key Functional Modules

* **Lifecycle Questionnaire Pipeline (`/questionnaire`):** Dynamically loads questions mapped to the selected project phase, with real-time field validation, draft saving, and structured payload generation.
* **Priority Weighting (`/tai_sort`):** Interactive drag-and-drop interface allowing stakeholders to define project-specific indicator weights prior to assessment.
* **Evaluation Dashboard & Reports (`/report`):** Visualizes multi-dimensional compliance via normalized **Chart.js Radar Charts**, generating diagnostic strengths, vulnerability scores, and mitigation guidance.
* **Project & Audit History (`/home`, `/history`):** Persistent audit trails enabling project teams to monitor trustworthiness drift across model iterations.
* **Localized Experience:** Full bilingual support (English and Traditional Chinese) powered by `react-i18next` and dynamic translation pipelines.


## 🛠️ Tech Stack

* **Core Framework:** [Next.js 15](https://nextjs.org/) (App Router Architecture, React Server/Client Components)
* **Language:** TypeScript 5 (Strict type checking)
* **Styling & Design System:** Tailwind CSS, PostCSS, Lucide React
* **Data Visualization:** Chart.js, react-chartjs-2
* **Internationalization:** i18next, react-i18next
* **Content & Parser:** react-markdown with remark-gfm


## 📁 Repository Structure

```text
.
├── src/
│   ├── app/                      # Next.js App Router route handlers & pages
│   │   ├── page.tsx              # Portal landing page & framework overview
│   │   ├── login/                # Authentication & session handling
│   │   ├── home/                 # Project management console
│   │   ├── tai_sort/             # Drag-and-drop indicator prioritization
│   │   ├── choose_questionnaire/ # Lifecycle stage selector (Pre/Mid/Post)
│   │   ├── questionnaire/        # Multi-stage questionnaire workflows
│   │   ├── report/               # Analytical radar chart & report generator
│   │   ├── history/              # Historical evaluation log
│   │   └── admin/                # Role-based administration dashboard
│   ├── components/               # Modular UI component library
│   │   ├── Header.tsx            # Global navigation & language switcher
│   │   ├── QuestionnaireContent.tsx # Dynamic form rendering engine
│   │   └── ReportRadarChart.tsx  # Dynamic 11-axis Chart.js radar component
│   ├── lib/                      # Shared client utilities & i18n initialization
│   └── locales/                  # Localized dictionaries (EN, ZH-TW)
├── docs/                         # Architecture documentation & presentation assets
├── public/                       # Static brand assets & documentation media
├── tailwind.config.ts            # Design tokens & responsive breakpoints
├── tsconfig.json                 # TypeScript compiler options
└── next.config.ts                # Next.js build parameters & API proxy rewrites
```

## ⚡ Getting Started

### Prerequisites

* **Node.js:** `v18.17.0` or higher
* **Package Manager:** `npm`, `pnpm`, or `yarn`
* **TAI Backend API:** Service running on `http://localhost:3001` (refer to [TAI Backend Repository](https://github.com/TAI-trustworthy-ai-lab/backend?utm_source=gemini))


### 🔗 Backend Service Dependency

This frontend application requires the TAI Backend Scoring Engine to handle questionnaire retrieval, response persistence, and radar chart calculations.

* **Backend Repository:** [`TAI-trustworthy-ai-lab/backend`](https://github.com/TAI-trustworthy-ai-lab/backend)


### Installation & Local Run

1. **Clone the repository:**
```bash
git clone [https://github.com/TAI-trustworthy-ai-lab/Trustworthy-AI-Assessment-System-Design.git](https://github.com/TAI-trustworthy-ai-lab/Trustworthy-AI-Assessment-System-Design.git)
cd Trustworthy-AI-Assessment-System-Design
```


2. **Install project dependencies:**
```bash
npm install
```


3. **Configure Environment Variables:**
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```


4. **Launch development server:**
```bash
npm run dev
```
Navigate to `http://localhost:3000` in your browser.

5. **Production Build & Linting:**
```bash
npm run lint        # Run ESLint verification
npx tsc --noEmit    # Type-check TypeScript sources
npm run build       # Compile optimized production bundle
```

## 👥 Engineering Team & Modules

Developed collaboratively by the **TAI Trustworthy AI Lab** frontend team:

| Teammate | Focus Area | Key Contributions |
| :--- | :--- | :--- |
| **劉靖媛**<br>([@jyliew1912](https://github.com/jyliew1912)) | **Project Console & Evaluation Engine** | • Engineered Home dashboard, Report page, and multi-stage Questionnaire flows with component testing<br>• Optimized Login and TAI-sort indicator prioritization interfaces |
| **呂辰祐**<br>([@Shangguanmoxi520](https://github.com/Shangguanmoxi520)) | **Audit History & Response Viewer** | • Implemented Response History log (`/history`) and Pre-login onboarding landing views<br>• Built structured evaluation Response Viewer components |
| **王峻文**<br>([@codingkcc](https://github.com/codingkcc)) | **Administration & Localization** | • Developed Admin dashboard (`/admin`) and About page documentation<br>• Integrated multilingual translation pipeline (i18n) and drafted initial TAI-sort module |
| **Max Drechsler**<br>([@MaxDrechsler](https://github.com/MaxDrechsler)) | **Authentication & Quality Assurance** | • Developed initial Login workflow architecture<br>• Coordinated frontend development standards and established unit testing infrastructure |



## 📄 License

This project is distributed under the **MIT License**. See the [`LICENSE`](LICNESE) file for complete terms.
