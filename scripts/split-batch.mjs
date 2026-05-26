import fs from 'fs';
import path from 'path';

const n = process.argv[2];
const part = process.argv[3]; // 'a' | 'b' | 'all'
const base = path.resolve('c:/N8N/Workflow_social');
const p = JSON.parse(fs.readFileSync(path.join(base, `.push-batch${n}.json`), 'utf8'));

const splits = {
  1: { a: 6, b: 6 },
  2: { a: 9, b: 9 },
  3: { a: 6, b: 6 },
  4: { a: 3, b: 0 },
};

const split = splits[n];
let files = p.files;
if (part !== 'all' && split) {
  const cut = part === 'a' ? split.a : split.a;
  files = part === 'a' ? p.files.slice(0, split.a) : p.files.slice(split.a);
}

const out = {
  owner: p.owner,
  repo: p.repo,
  branch: p.branch,
  message: part === 'all' ? p.message : `${p.message} (${part})`,
  files,
};
const outPath = path.join(base, `.push-batch${n}-${part}.json`);
fs.writeFileSync(outPath, JSON.stringify(out), 'utf8');
console.log(outPath, files.length, 'files');
