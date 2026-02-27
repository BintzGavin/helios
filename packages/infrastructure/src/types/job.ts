export interface WorkerJob {
  /** The command to execute */
  command: string;
  /** Arguments to pass to the command */
  args?: string[];
  /** Environment variables to set for the process */
  env?: Record<string, string>;
  /** Current working directory for the process */
  cwd?: string;
  /** Timeout in milliseconds after which the process will be killed */
  timeout?: number;
  /** Additional metadata for adapters (e.g., chunk ID) */
  meta?: Record<string, any>;
}
