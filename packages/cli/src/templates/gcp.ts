export const CLOUD_RUN_JOB_TEMPLATE = `apiVersion: run.googleapis.com/v1
kind: Job
metadata:
  name: helios-render-job
spec:
  template:
    spec:
      taskCount: 10 # Adjust this based on your job's requirements
      template:
        spec:
          containers:
          - image: gcr.io/PROJECT_ID/IMAGE_NAME:TAG # Replace with your image
            command: ["/bin/sh", "-c"]
            args:
            - "npm exec -- helios job run job.json --chunk \${CLOUD_RUN_TASK_INDEX}"
            resources:
              limits:
                memory: "2Gi"
                cpu: "1000m"
          timeoutSeconds: 3600 # Adjust timeout as needed
          maxRetries: 3
`;

export const README_GCP_TEMPLATE = `# Deploying Helios to Google Cloud Run Jobs

This guide explains how to run distributed rendering jobs on Google Cloud Run.

## Prerequisites

1.  **Google Cloud Project**: You need a Google Cloud Project with Cloud Run API enabled.
2.  **gcloud CLI**: Install and configure the \`gcloud\` CLI.
3.  **Docker**: Install Docker to build your image.

## Steps

### 1. Generate Job File

First, generate the rendering job specification locally. This defines how the rendering is split into chunks.

\`\`\`bash
npm run render -- --emit-job job.json --video-codec libx264
\`\`\`

This will create a \`job.json\` file in your project root.

### 2. Build and Push Docker Image

Build your Docker image and push it to Google Container Registry (GCR) or Artifact Registry.

\`\`\`bash
export PROJECT_ID=your-project-id
export IMAGE_NAME=helios-render
export TAG=latest

# Build the image
docker build -t gcr.io/$PROJECT_ID/$IMAGE_NAME:$TAG .

# Push the image
docker push gcr.io/$PROJECT_ID/$IMAGE_NAME:$TAG
\`\`\`

### 3. Update Configuration

Open \`cloud-run-job.yaml\` and update the following fields:

-   \`image\`: Set to \`gcr.io/your-project-id/helios-render:latest\` (or your image URL).
-   \`taskCount\`: Set to the number of chunks you want to process in parallel (ensure this matches or exceeds the chunks in \`job.json\`).

### 4. Deploy the Job

Deploy the job definition to Cloud Run.

\`\`\`bash
gcloud run jobs replace cloud-run-job.yaml
\`\`\`

### 5. Execute the Job

Run the job.

\`\`\`bash
gcloud run jobs execute helios-render-job
\`\`\`

### 6. Retrieve Output

The output files will be stored in the container. To retrieve them, you should configure your job to write to a Google Cloud Storage bucket.

**Modify \`cloud-run-job.yaml\` to mount a GCS bucket:**

1.  Add the volume mount to the container spec.
2.  Configure the volume to use a GCS bucket.

For more details, see [Cloud Run documentation on GCS integration](https://cloud.google.com/run/docs/configuring/services/cloud-storage-volume-mounts).
`;
