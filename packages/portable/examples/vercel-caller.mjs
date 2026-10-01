// Copy into the SaaS's server-side Vercel project. Install @vercel/oidc there.
// This function never exposes the platform token to the browser, logs, or files.
import { getVercelOidcToken } from '@vercel/oidc';
import { RenderClient } from '@helios-project/portable/client';

export async function renderFromSaas(endpoint, plan, stableWorkflowKey) {
  const client = new RenderClient(endpoint, {
    headers: async () => ({ authorization: `Bearer ${await getVercelOidcToken()}` }),
  });
  const job = await client.submit(plan, stableWorkflowKey);
  const completed = await client.wait(job.id);
  return { id: completed.id, output: completed.output };
}
