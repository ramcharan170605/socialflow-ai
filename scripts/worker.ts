/**
 * Optional BullMQ worker for queued generations.
 * Run: npm run worker
 * Requires REDIS_URL and USE_QUEUE=true
 */
import { connectDB } from '../lib/db';
import { startWorker, type QueueJobData } from '../lib/queue';
import { triggerN8nWorkflow } from '../lib/n8n';
import { GeneratedPost } from '../models/GeneratedPost';
import { WorkflowExecution } from '../models/WorkflowExecution';
import { trackUsage } from '../lib/user-service';
import type { Job } from 'bullmq';
import type { PlatformId } from '../lib/platforms';

async function processJob(job: Job<QueueJobData>) {
  const start = Date.now();
  const data = job.data;

  await connectDB();
  await WorkflowExecution.findOneAndUpdate(
    { executionId: data.executionId },
    { status: 'running' }
  );

  try {
    const result = await triggerN8nWorkflow({
      websiteUrl: data.websiteUrl,
      scrapedContent: data.scrapedContent,
      userPrompt: data.userPrompt,
      optimizedPrompt: data.optimizedPrompt,
      platform: data.platform as PlatformId,
      userId: data.userId,
      executionId: data.executionId,
    });

    await GeneratedPost.findOneAndUpdate(
      { executionId: data.executionId },
      {
        status: 'completed',
        content: result.content ?? '',
        summary: result.summary,
        qualityScore: result.qualityScore,
        wordCount: result.wordCount,
      }
    );

    await WorkflowExecution.findOneAndUpdate(
      { executionId: data.executionId },
      {
        status: 'completed',
        output: result,
        durationMs: Date.now() - start,
      }
    );

    await trackUsage(data.userId, data.platform, 1);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Worker failed';
    await GeneratedPost.findOneAndUpdate(
      { executionId: data.executionId },
      { status: 'failed', error: message }
    );
    await WorkflowExecution.findOneAndUpdate(
      { executionId: data.executionId },
      { status: 'failed', error: message }
    );
    throw err;
  }
}

const worker = startWorker(processJob);

if (!worker) {
  console.error('REDIS_URL not set — worker cannot start');
  process.exit(1);
}

console.log('SocialFlow worker started');
worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});
