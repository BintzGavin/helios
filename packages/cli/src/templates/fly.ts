export const FLY_TOML_TEMPLATE = `app = "helios-render-worker"
primary_region = "ord"

[build]
  dockerfile = "Dockerfile"

[env]
  # Add any necessary environment variables here

[experimental]
  auto_rollback = true

[[services]]
  protocol = "tcp"
  internal_port = 8080
  processes = ["app"]

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [services.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20
`;

export const FLY_DOCKERFILE_TEMPLATE = `FROM mcr.microsoft.com/playwright:v1.49.1-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Optional: Build step if you are compiling TypeScript
# RUN npm run build

# Expose port (if your worker listens for HTTP requests, otherwise not strictly required for purely event-driven workers)
EXPOSE 8080

# Start the worker
CMD ["npm", "start"]
`;

export const README_FLY_TEMPLATE = `# Helios Fly.io Deployment

This directory contains the configuration required to deploy a Helios rendering worker to Fly.io Machines.

## Prerequisites

1.  **Fly Account:** You need an active Fly.io account.
2.  **flyctl CLI:** Ensure you have the Fly CLI installed (\`flyctl\` or \`fly\`).
3.  **Authentication:** Authenticate with your Fly account.
    \`\`\`bash
    fly auth login
    \`\`\`

## Deployment

1.  **Review Configuration:** Check the \`fly.toml\` file to customize the app name, region, and compute resources. You may want to configure a Machine with a GPU for heavy rendering.
2.  **Launch App:** Since the \`fly.toml\` is already created, you can deploy directly. If the app doesn't exist yet, you may need to run \`fly launch\` and tell it to use the existing config.
    \`\`\`bash
    fly deploy
    \`\`\`
3.  **Note the App Name:** You will need the app name (e.g., \`helios-render-worker\`) to execute jobs.

## Executing Jobs

Once deployed, you can use the Helios CLI to execute distributed rendering jobs against your Fly.io Machines. You will need a Fly API token.

\`\`\`bash
export FLY_API_TOKEN="your_personal_access_token"
helios job run <path-to-job.json> --adapter fly --app-name helios-render-worker
\`\`\`

Replace \`<path-to-job.json>\` with your job specification and \`helios-render-worker\` with the actual app name defined in \`fly.toml\`.
`;