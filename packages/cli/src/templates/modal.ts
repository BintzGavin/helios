export const README_MODAL_TEMPLATE = `# Modal Deployment Guide

This document provides instructions for deploying Helios using Modal.

## Prerequisites

1.  A Modal account and Modal token.
2.  Install the Modal CLI: \`pip install modal\`
3.  Authenticate: \`modal token new\`

## Setup

1.  Ensure your Modal secret (if needed) is configured in your Modal dashboard or via CLI.
2.  Set the environment variable \`MODAL_TOKEN_ID\` and \`MODAL_TOKEN_SECRET\` if running outside a pre-authenticated environment.

## Deployment

Deploy your Helios application to Modal:

\`\`\`bash
modal deploy your_modal_app_script.py
\`\`\`

*(Note: Ensure you have a valid python entrypoint script configured for your specific application requirements. See Modal documentation for advanced configurations).*
`;
