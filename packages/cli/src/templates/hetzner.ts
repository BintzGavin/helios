export const README_HETZNER_TEMPLATE = `# Hetzner Cloud Deployment

This directory contains the configuration to deploy your Helios rendering jobs to Hetzner Cloud.

## Prerequisites

1. A [Hetzner Cloud account](https://www.hetzner.com/cloud/).
2. An API Token generated from your Hetzner Cloud Console (Security > API Tokens). The token requires Read & Write permissions.

## Environment Setup

You need to provide your API token and optional server configuration to the Helios CLI. Set the following environment variables:

\`\`\`bash
# Required
export HETZNER_API_TOKEN="your-api-token-here"

# Optional (Defaults shown)
export HETZNER_SERVER_TYPE="cpx11"
export HETZNER_IMAGE="ubuntu-24.04"
export HETZNER_LOCATION="fsn1"
\`\`\`

## Running Jobs

To execute a distributed rendering job on Hetzner Cloud, use the \`helios job run\` command and specify the \`hetzner\` adapter:

\`\`\`bash
helios job run render-job.json --adapter hetzner
\`\`\`

The adapter will automatically provision a VM for each job chunk, execute the render, and terminate the VM upon completion.
`;
