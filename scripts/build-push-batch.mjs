import fs from 'fs';
import path from 'path';

const base = path.resolve('c:/N8N/Workflow_social');
const owner = 'ramcharan170605';
const repo = 'socialflow-ai';
const branch = 'main';

const batches = [
  {
    name: 'batch1',
    message: 'Add app routes and pages',
    paths: [
      'app/api/crawl/route.ts',
      'app/api/generate/route.ts',
      'app/api/health/route.ts',
      'app/api/history/route.ts',
      'app/api/stream/route.ts',
      'app/api/usage/route.ts',
      'app/dashboard/page.tsx',
      'app/globals.css',
      'app/layout.tsx',
      'app/page.tsx',
      'app/sign-in/[[...sign-in]]/page.tsx',
      'app/sign-up/[[...sign-up]]/page.tsx',
    ],
  },
  {
    name: 'batch2',
    message: 'Add components and lib',
    paths: [
      'components/ContentPreview.tsx',
      'components/DashboardView.tsx',
      'components/GenerateForm.tsx',
      'components/Header.tsx',
      'components/Hero.tsx',
      'components/ProductFeatures.tsx',
      'components/ThemeProvider.tsx',
      'lib/auth.ts',
      'lib/db.ts',
      'lib/firecrawl.ts',
      'lib/n8n.ts',
      'lib/platforms.ts',
      'lib/queue.ts',
      'lib/rate-limit.ts',
      'lib/redis.ts',
      'lib/sanitize.ts',
      'lib/user-service.ts',
      'lib/validations.ts',
    ],
  },
  {
    name: 'batch3',
    message: 'Add models, worker, and infrastructure',
    paths: [
      'models/GeneratedPost.ts',
      'models/PromptHistory.ts',
      'models/UsageAnalytics.ts',
      'models/User.ts',
      'models/WorkflowExecution.ts',
      'scripts/worker.ts',
      '.eslintrc.json',
      'next-env.d.ts',
      'nginx/nginx.conf',
      'docker-compose.yml',
      'Dockerfile',
      'Dockerfile.worker',
    ],
  },
  {
    name: 'batch4',
    message: 'Add docs and workflow config',
    paths: ['README.md', 'DEPLOY-RENDER.md', 'workflow.json'],
  },
];

for (const batch of batches) {
  const files = batch.paths.map((p) => ({
    path: p,
    content: fs.readFileSync(path.join(base, p), 'utf8'),
  }));
  const payload = { owner, repo, branch, message: batch.message, files };
  const out = path.join(base, `.push-${batch.name}.json`);
  fs.writeFileSync(out, JSON.stringify(payload), 'utf8');
  console.log(`${batch.name}: ${files.length} files -> ${out}`);
}
