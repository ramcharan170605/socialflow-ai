/**
 * Push .push-batch*.json payloads to GitHub (mirrors MCP push_files).
 * Requires: GITHUB_PERSONAL_ACCESS_TOKEN in environment
 */
import fs from 'fs';
import path from 'path';

const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
if (!token) {
  console.error('Set GITHUB_PERSONAL_ACCESS_TOKEN');
  process.exit(1);
}

const base = path.resolve('c:/N8N/Workflow_social');
const batches = [
  { file: '.push-batch1.json', label: 'Batch 1: Add app routes and pages' },
  { file: '.push-batch2.json', label: 'Batch 2: Add components and lib' },
  { file: '.push-batch3.json', label: 'Batch 3: Add models, worker, and infrastructure' },
  { file: '.push-batch4-all.json', label: 'Batch 4: Add docs and workflow config' },
];

async function gh(url, opts = {}) {
  const res = await fetch(`https://api.github.com${url}`, {
    ...opts,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${url}: ${data.message || text}`);
  }
  return data;
}

async function pushBatch(payload) {
  const { owner, repo, branch, message, files } = payload;
  const refData = await gh(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  const baseSha = refData.object.sha;
  const commit = await gh(`/repos/${owner}/${repo}/git/commits/${baseSha}`);
  const baseTreeSha = commit.tree.sha;

  const tree = files.map((f) => ({
    path: f.path,
    mode: '100644',
    type: 'blob',
    content: f.content,
  }));

  const newTree = await gh(`/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_tree: baseTreeSha, tree }),
  });

  const newCommit = await gh(`/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      tree: newTree.sha,
      parents: [baseSha],
    }),
  });

  await gh(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: newCommit.sha, force: false }),
  });

  return newCommit.sha;
}

async function main() {
  const results = [];
  for (const batch of batches) {
    const full = path.join(base, batch.file);
    if (!fs.existsSync(full)) {
      console.warn('skip missing', batch.file);
      continue;
    }
    const payload = JSON.parse(fs.readFileSync(full, 'utf8'));
    const sha = await pushBatch(payload);
    results.push({
      batch: batch.label,
      file: batch.file,
      message: payload.message,
      fileCount: payload.files.length,
      paths: payload.files.map((f) => f.path),
      sha: sha.slice(0, 7),
    });
    console.log(`OK ${batch.label}: ${payload.files.length} files -> ${sha.slice(0, 7)}`);
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
