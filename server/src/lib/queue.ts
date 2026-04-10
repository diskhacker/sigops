import { Queue, Worker, type Processor, type JobsOptions } from "bullmq";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const connection = { url: env.REDIS_URL };

const queues = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, { connection });
    queues.set(name, q);
  }
  return q;
}

export async function enqueue(
  queueName: string,
  jobName: string,
  data: unknown,
  opts?: JobsOptions,
): Promise<void> {
  const q = getQueue(queueName);
  await q.add(jobName, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    ...opts,
  });
}

export function startWorker(
  queueName: string,
  processor: Processor,
): Worker {
  const w = new Worker(queueName, processor, { connection });
  w.on("failed", (job, err) =>
    logger.error({ queue: queueName, jobId: job?.id, err }, "job failed"),
  );
  w.on("completed", (job) =>
    logger.info({ queue: queueName, jobId: job.id }, "job completed"),
  );
  return w;
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((q) => q.close()));
  queues.clear();
}
