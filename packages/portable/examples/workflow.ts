import { RenderClient } from '../src/client.js';
import type { Plan } from '../src/plan.js';

/** Call from the SaaS's existing durable workflow after freezing its composition. */
export async function renderStep(input: { endpoint: string; plan: Plan; jobKey: string; headers: () => Promise<HeadersInit> }) {
  const renderer = new RenderClient(input.endpoint, { headers: input.headers });
  // Upload assets with renderer.upload(bytes) before this step and put their
  // immutable identities in the plan. Persist jobKey before the first attempt.
  const job = await renderer.submit(input.plan, input.jobKey);
  // A retry reattaches to this exact job. Each call runs only the next bounded step.
  const completed = await renderer.wait(job.id, { timeoutMs: 15 * 60 * 1000 });
  return { jobId: completed.id, artifact: completed.output, download: () => renderer.download(completed.id) };
}
