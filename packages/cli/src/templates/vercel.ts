export const README_VERCEL_TEMPLATE = `# Vercel Deployment Guide

This document provides instructions for deploying Helios using Vercel.

## Prerequisites

1.  A Vercel account.
2.  Install the Vercel CLI: \`npm i -g vercel\`
3.  Authenticate with Vercel: \`vercel login\`

## Setup

1.  Set the required environment variable \`VERCEL_TOKEN\` if running in an automated environment (CI/CD).
2.  Configure any other required secrets in your Vercel project settings.

## Deployment

Deploy your Helios application to Vercel:

\`\`\`bash
vercel --prod
\`\`\`
`;
