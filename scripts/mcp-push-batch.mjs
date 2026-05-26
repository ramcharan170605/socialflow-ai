/**
 * Prints push_files MCP arguments as JSON to stdout (for batch N).
 * Usage: node scripts/mcp-push-batch.mjs 1
 */
import fs from 'fs';
import path from 'path';

const n = process.argv[2];
if (!n) {
  console.error('Usage: node mcp-push-batch.mjs <1-4>');
  process.exit(1);
}
const file = path.resolve(`c:/N8N/Workflow_social/.push-batch${n}.json`);
const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
process.stdout.write(JSON.stringify(payload));
