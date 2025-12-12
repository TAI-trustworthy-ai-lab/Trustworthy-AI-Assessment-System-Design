# Trustworthy AI Assessment System

A comprehensive web-based platform for evaluating AI systems across 11 key trustworthiness indicators, including Accuracy, Reliability, Safety, Resilience, Transparency, Accountability, Explainability, Autonomy, Privacy, Fairness, and Security.

## 🌟 Features

- **Multi-stage Assessment**: Evaluate AI systems at three stages - before, during, and after modeling
- **TAI Priority Sorting**: Customize the importance ranking of trustworthiness indicators for your project
- **Comprehensive Reports**: Generate detailed radar charts and analysis reports with scoring
- **Project Management**: Create and manage multiple AI assessment projects
- **Response History**: View, edit, and track all previous assessment responses
- **Multilingual Support**: Full support for English and Chinese (Traditional) via i18next
- **Admin Dashboard**: User management and system administration features

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Backend API running on `http://localhost:3001` (see backend repository)

### Installation

1. Clone the repository and navigate to the project directory:
```bash
cd my-next-app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Setup

Ensure your backend API is running at `http://localhost:3001`. The application expects the following API endpoints:

- `/api/auth/*` - Authentication
- `/api/project/*` - Project management
- `/api/questionnaire/*` - Questionnaire data
- `/api/response/*` - User responses
- `/api/report/*` - Assessment reports

## 📁 Project Structure

```
my-next-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Landing page (pre-login)
│   │   ├── login/             # Authentication
│   │   ├── home/              # Project dashboard
│   │   ├── tai_sort/          # TAI indicator prioritization
│   │   ├── choose_questionnaire/ # Questionnaire stage selection
│   │   ├── questionnaire/             # Questionnaire pages 
│   │   ├── report/            # Assessment report viewer
│   │   ├── history/           # Response history
│   │   └── admin/             # Admin dashboard
│   ├── components/            # Reusable React components
│   │   ├── Header.tsx
│   │   ├── AuthHeader.tsx
│   │   ├── QuestionnaireContent.tsx
│   │   └── ReportRadarChart.tsx
│   ├── lib/                   # Utilities and configurations
│   │   └── i18n.tsx          # Internationalization setup
│   └── locales/               # Translation files
│       ├── en/
│       └── zh/
├── public/                    # Static assets
├── tailwind.config.ts        # Tailwind CSS configuration
└── next.config.ts            # Next.js configuration
```

## 🎯 Key Pages

### Authentication Flow
- [`/`](src/app/page.tsx) - Landing page with TAI introduction
- [`/login`](src/app/login/page.tsx) - Login and registration
- [`/about`](src/app/about/page.tsx) - About the system

### Main Application
- [`/home`](src/app/home/page.tsx) - Project dashboard (create/view/delete projects)
- [`/tai_sort`](src/app/tai_sort/page.tsx) - Drag-and-drop TAI indicator prioritization
- [`/choose_questionnaire`](src/app/choose_questionnaire/page.tsx) - Select assessment stage
- [`/questionnaire`](src/app/questionnaire/page.tsx) - Auto fetch pre-modeling, mid-modeling and post-modeling questionnaire
- [`/report`](src/app/report/page.tsx) - View detailed assessment report
- [`/history`](src/app/history/page.tsx) - Browse all past responses

### Administration
- [`/admin`](src/app/admin/page.tsx) - User management (admin only)

## 🛠️ Technologies Used

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Chart.js with react-chartjs-2
- **Internationalization**: i18next + react-i18next
- **Translation API**: Google Translate API-X (custom API route)
- **Markdown Rendering**: react-markdown with remark-gfm
- **Icons**: Lucide React

## 🌐 Internationalization

Add translations by updating files in [`src/locales/`](src/locales/):
- [`en/translation.json`](src/locales/en/translation.json) - English
- [`zh/translation.json`](src/locales/zh/translation.json) - Chinese (Traditional)

See [`src/languageSetup.md`](src/languageSetup.md) for detailed instructions.

## 🔐 Authentication

User authentication is handled via:
- Login/Registration: [`/login`](src/app/login/page.tsx)
- Protected routes wrapped with [`ProtectedLayout`](src/components/ProtectedLayout.tsx)
- Tokens stored in `localStorage` (`authToken`, `userId`)

## 📊 Assessment Workflow

1. **Create Project** - Define your AI project in [`/home`](src/app/home/page.tsx)
2. **Set TAI Priority** - Rank indicators at [`/tai_sort`](src/app/tai_sort/page.tsx)
3. **Choose Stage** - Select assessment stage at [`/choose_questionnaire`](src/app/choose_questionnaire/page.tsx)
4. **Complete Questionnaire** - Answer questions at `/questionnaire`
5. **View Report** - See results at [`/report`](src/app/report/page.tsx)
6. **Review History** - Access past assessments at [`/history`](src/app/history/page.tsx)

## 🧪 Development

### Build for Production
```bash
npm run build
npm run start
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npx tsc --noEmit
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

See [`tests/README.md`](tests/README.md) for detailed testing documentation.

## 📝 Configuration Files

- [`next.config.ts`](next.config.ts) - Next.js configuration
- [`tailwind.config.ts`](tailwind.config.ts) - Tailwind CSS theming
- [`tsconfig.json`](tsconfig.json) - TypeScript compiler options
- [`eslint.config.mjs`](eslint.config.mjs) - ESLint rules
- [`postcss.config.mjs`](postcss.config.mjs) - PostCSS configuration

### Environment Variables
Ensure your backend API URL is configured correctly in all files using `BASE_URL` or `API_BASE_URL`.

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Chart.js](https://www.chartjs.org/docs/)
- [i18next](https://www.i18next.com/)

## 🤝 Contributing

See [`InterfaceSpecifications.md`](../InterfaceSpecifications.md) for detailed interface specifications and contribution guidelines.

## 📄 License

## 👥 Team

---

Built with ❤️ using Next.js and Tailwind CSS
