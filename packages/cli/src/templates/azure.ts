export const AZURE_FUNCTION_JSON_TEMPLATE = `{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get", "post"]
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}`;

export const AZURE_HOST_JSON_TEMPLATE = `{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[3.*, 4.0.0)"
  }
}`;

export const AZURE_LOCAL_SETTINGS_JSON_TEMPLATE = `{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node"
  }
}`;

export const AZURE_INDEX_JS_TEMPLATE = `const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile);

module.exports = async function (context, req) {
  context.log('Received HTTP request for rendering job.');

  const jobPath = req.query.jobPath || (req.body && req.body.jobPath) || 'job.json';
  const chunkIndex = req.query.chunkIndex !== undefined ? req.query.chunkIndex : (req.body && req.body.chunkIndex !== undefined ? req.body.chunkIndex : 0);

  try {
    context.log(\`Starting render for chunk \${chunkIndex} of job \${jobPath}...\`);

    // Execute the helios job run command safely
    const { stdout, stderr } = await execFilePromise('npx', ['helios', 'job', 'run', jobPath, '--chunk', String(chunkIndex)]);

    context.log('Render output:', stdout);
    if (stderr) context.log.error('Render errors:', stderr);

    context.res = {
      status: 200,
      body: {
        message: 'Render complete',
        chunkIndex,
        output: stdout
      }
    };
  } catch (error) {
    context.log.error('Render failed:', error);
    context.res = {
      status: 500,
      body: {
        message: 'Render failed',
        error: error.message
      }
    };
  }
};`;

export const README_AZURE_TEMPLATE = `# Deploying Helios to Azure Functions

This guide explains how to run distributed rendering jobs on Azure Functions.

## Prerequisites

1.  **Azure CLI**: Install and configure the Azure CLI.
2.  **Azure Functions Core Tools**: Install for local development and deployment.
3.  **Node.js**: Ensure Node.js is installed.

## Steps

### 1. Generate Job File

Generate the rendering job specification locally.

\`\`\`bash
npm run render -- --emit-job job.json
\`\`\`

### 2. Local Testing (Optional)

You can test the function locally using Azure Functions Core Tools.

\`\`\`bash
func start
\`\`\`

Then, send a POST request to \`http://localhost:7071/api/RenderJob\` with the job payload.

### 3. Deploy to Azure

Use the Azure Functions Core Tools to deploy to your Azure Function App.

\`\`\`bash
func azure functionapp publish <YourFunctionAppName>
\`\`\`

### 4. Execute the Job

Invoke the function via HTTP request (e.g., using \`curl\` or Postman).

\`\`\`bash
curl -X POST https://<YourFunctionAppName>.azurewebsites.net/api/RenderJob \\
     -H "Content-Type: application/json" \\
     -d '{"jobPath": "job.json", "chunkIndex": 0}'
\`\`\`

You can automate this to invoke the function for all chunks in your \`job.json\`.
`;
