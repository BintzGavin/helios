export const AWS_DOCKERFILE_TEMPLATE = `FROM public.ecr.aws/lambda/nodejs:20

# Install dependencies for Chromium (required for rendering)
RUN dnf install -y \
    nss \
    alsa-lib \
    at-spi2-atk \
    at-spi2-core \
    cups-libs \
    dbus-glib \
    libXcomposite \
    libXcursor \
    libXdamage \
    libXext \
    libXi \
    libXrandr \
    libXScrnSaver \
    libXtst \
    pango \
    xorg-x11-fonts-100dpi \
    xorg-x11-fonts-75dpi \
    xorg-x11-fonts-cyrillic \
    xorg-x11-fonts-misc \
    xorg-x11-fonts-Type1 \
    xorg-x11-utils \
    && dnf clean all

# Set working directory
WORKDIR \${LAMBDA_TASK_ROOT}

# Copy package files
COPY package*.json ./

# Install dependencies (including Helios)
RUN npm ci

# Copy function code and project files
COPY . .

# Build the project if necessary (uncomment if you have a build step)
# RUN npm run build

# Install Playwright browsers (chromium only)
RUN npx playwright install chromium

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "lambda.handler" ]
`;

export const AWS_LAMBDA_HANDLER_TEMPLATE = `const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Default values
  const jobPath = event.jobPath || 'job.json';
  const chunkIndex = event.chunkIndex !== undefined ? event.chunkIndex : 0;

  try {
    console.log(\`Starting render for chunk \${chunkIndex} of job \${jobPath}...\`);

    // Execute the helios job run command
    // We use --no-install to skip dependency checks since we're in a container
    const command = \`npx helios job run \${jobPath} --chunk \${chunkIndex}\`;

    const { stdout, stderr } = await execPromise(command);

    console.log('Render output:', stdout);
    if (stderr) console.error('Render errors:', stderr);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Render complete',
        chunkIndex,
        output: stdout
      }),
    };
  } catch (error) {
    console.error('Render failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Render failed',
        error: error.message
      }),
    };
  }
};
`;

export const AWS_SAM_TEMPLATE = `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: >
  Helios Distributed Rendering on AWS Lambda

Globals:
  Function:
    Timeout: 900 # 15 minutes (max for Lambda)
    MemorySize: 3008 # 3GB (adjust as needed for rendering)

Resources:
  HeliosRenderFunction:
    Type: AWS::Serverless::Function
    Properties:
      PackageType: Image
      Architectures:
        - x86_64
      Environment:
        Variables:
          NODE_ENV: production
    Metadata:
      DockerTag: latest
      DockerContext: .
      Dockerfile: Dockerfile

Outputs:
  HeliosRenderFunction:
    Description: "Helios Render Lambda Function ARN"
    Value: !GetAtt HeliosRenderFunction.Arn
  HeliosRenderFunctionIamRole:
    Description: "Implicit IAM Role created for Helios Render function"
    Value: !GetAtt HeliosRenderFunctionRole.Arn
`;

export const README_AWS_TEMPLATE = `# Deploying Helios to AWS Lambda

This guide explains how to run distributed rendering jobs on AWS Lambda using container images.

## Prerequisites

1.  **AWS CLI**: Install and configure the AWS CLI.
2.  **AWS SAM CLI**: Install the AWS SAM CLI for deployment.
3.  **Docker**: Install Docker to build your image.

## Steps

### 1. Generate Job File

Generate the rendering job specification locally.

\`\`\`bash
npm run render -- --emit-job job.json
\`\`\`

### 2. Build and Deploy

Use the AWS SAM CLI to build and deploy your application.

\`\`\`bash
# Build the application
sam build

# Deploy to AWS (follow the prompts)
sam deploy --guided
\`\`\`

During the guided deployment:
-   Stack Name: \`helios-render-stack\` (or your choice)
-   AWS Region: Your preferred region (e.g., \`us-east-1\`)
-   Image Repository: You will need an ECR repository URI. If you don't have one, create it:
    \`aws ecr create-repository --repository-name helios-render\`

### 3. Execute the Job

Invoke the Lambda function for a specific chunk.

\`\`\`bash
aws lambda invoke \\
    --function-name helios-render-function \\
    --payload '{"jobPath": "job.json", "chunkIndex": 0}' \\
    response.json
\`\`\`

You can automate this to invoke the function for all chunks in your \`job.json\`.

### 4. Output Handling

By default, the rendered video chunk will be saved inside the ephemeral container filesystem and lost when the Lambda finishes.
To persist the output, you should modify your project to upload the result to S3.

**Recommended approach:**
1.  Configure your Helios project or \`job.json\` to output to a specific directory.
2.  Modify \`lambda.js\` to upload the output file to S3 after rendering.
3.  Ensure the Lambda execution role has \`s3:PutObject\` permissions.
`;
