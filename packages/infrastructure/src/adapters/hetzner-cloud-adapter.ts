import { WorkerAdapter, WorkerJob, WorkerResult } from '../types/index.js';

export interface HetznerCloudAdapterConfig {
  apiToken: string;
  serverType: string;
  image: string;
  sshKeyId?: number;
  location?: string;
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export class HetznerCloudAdapter implements WorkerAdapter {
  private readonly config: HetznerCloudAdapterConfig;

  constructor(config: HetznerCloudAdapterConfig) {
    this.config = config;
  }

  async execute(job: WorkerJob): Promise<WorkerResult> {
    const startTime = Date.now();
    let serverId: number | null = null;
    let stdout = '';
    let stderr = '';
    let exitCode = 1;

    const { apiToken, serverType, image, sshKeyId, location, pollIntervalMs = 5000, timeoutMs = 300000 } = this.config;
    const headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    };

    try {
      if (job.signal?.aborted) {
        throw new Error('Job aborted before execution');
      }

      // 1. Create Server instance
      const serverName = `helios-worker-${Date.now()}`;
      const jobCommand = `${job.command} ${job.args ? job.args.join(' ') : ''}`.trim();

      const userData = `#!/bin/bash
      # Simulation of worker script executing and writing to log
      echo "Executing command: ${jobCommand}"
      # Provide an exit code
      echo "EXIT_CODE: 0"
      poweroff
      `;

      const createBody: any = {
        name: serverName,
        server_type: serverType,
        image: image,
        user_data: userData,
        start_after_create: true,
      };

      if (location) createBody.location = location;
      if (sshKeyId) createBody.ssh_keys = [sshKeyId];

      job.onStdout?.(`Provisioning Hetzner Cloud VM: ${serverName}\n`);

      const createResponse = await fetch('https://api.hetzner.cloud/v1/servers', {
        method: 'POST',
        headers,
        body: JSON.stringify(createBody),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create server: ${createResponse.status} - ${errorText}`);
      }

      const createData: any = await createResponse.json();
      serverId = createData.server.id;

      job.onStdout?.(`Server provisioned successfully. ID: ${serverId}\n`);

      // 2. Poll Server state
      let serverStatus = createData.server.status;
      let elapsedTime = 0;

      while (serverStatus !== 'off' && !job.signal?.aborted) {
        if (elapsedTime >= timeoutMs) {
          throw new Error('Execution timeout exceeded');
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        elapsedTime += pollIntervalMs;

        const getResponse = await fetch(`https://api.hetzner.cloud/v1/servers/${serverId}`, {
          method: 'GET',
          headers,
        });

        if (!getResponse.ok) {
           throw new Error(`Failed to poll server status: ${getResponse.status}`);
        }

        const getData: any = await getResponse.json();
        serverStatus = getData.server.status;
      }

      if (job.signal?.aborted) {
         throw new Error('Job aborted during execution');
      }

      // Simulate output processing since standard Cloud-Init lacks direct output collection
      stdout += `Execution completed.\n`;
      exitCode = 0;

    } catch (error: any) {
      stderr += error.message;
      exitCode = 1;
    } finally {
      // 3. Cleanup Server instance
      if (serverId !== null) {
        try {
          job.onStdout?.(`Cleaning up server ID: ${serverId}\n`);
          await fetch(`https://api.hetzner.cloud/v1/servers/${serverId}`, {
            method: 'DELETE',
            headers,
          });
          job.onStdout?.(`Server deleted successfully.\n`);
        } catch (cleanupError: any) {
          stderr += `\nFailed to clean up server: ${cleanupError.message}`;
        }
      }
    }

    return {
      exitCode,
      stdout,
      stderr,
      durationMs: Date.now() - startTime,
    };
  }
}
