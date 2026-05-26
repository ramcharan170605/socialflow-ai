import { Queue, Worker, Job } from 'bullmq';
import { getRedis } from './redis';

const QUEUE_NAME = 'socialflow-generate';

export interface QueueJobData {
  userId: string;
  executionId: string;
  websiteUrl: string;
  scrapedContent: string;
  userPrompt: string;
  optimizedPrompt: string;
  platform: string;
}

let queue: Queue<QueueJobData> | null = null;

export function getGenerateQueue(): Queue<QueueJobData> | null {
  const redis = getRedis();
  if (!redis) return null;

  if (!queue) {
    queue = new Queue<QueueJobData>(QUEUE_NAME, {
      connection: { host: redis.options.host, port: redis.options.port },
    });
  }
  return queue;
}

export async function enqueueGeneration(
  data: QueueJobData
): Promise<{ queued: boolean; jobId?: string }> {
  const q = getGenerateQueue();
  if (!q) return { queued: false };

  const job = await q.add('generate', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });

  return { queued: true, jobId: job.id };
}

export type JobProcessor = (job: Job<QueueJobData>) => Promise<void>;

export function startWorker(processor: JobProcessor): Worker<QueueJobData> | null {
  const redis = getRedis();
  if (!redis) return null;

  return new Worker<QueueJobData>(QUEUE_NAME, processor, {
    connection: { host: redis.options.host, port: redis.options.port },
    concurrency: 2,
  });
}
