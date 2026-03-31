export const README_DENO_TEMPLATE = `# Deno Deploy Guide

This document provides instructions for deploying Helios using Deno Deploy.

## Prerequisites

1.  A Deno Deploy account.
2.  Install the \`deployctl\` CLI: \`npm install -g deployctl\`
3.  A valid Deno entrypoint (e.g. \`main.ts\`).

## Setup

1.  Authenticate with Deno Deploy: \`deployctl login\`
2.  Ensure you have your \`DENO_DEPLOY_TOKEN\` available if deploying from CI/CD.

## Deployment

Deploy your project to Deno Deploy:

\`\`\`bash
deployctl deploy --project=<your-project-name> ./main.ts
\`\`\`
`;
