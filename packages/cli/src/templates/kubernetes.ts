export const KUBERNETES_JOB_TEMPLATE = `apiVersion: batch/v1
kind: Job
metadata:
  name: helios-renderer-job
  namespace: default
spec:
  template:
    spec:
      containers:
      - name: renderer
        image: your-registry/helios-renderer:latest
        command: ["node", "dist/worker.js"]
        env:
        - name: RENDER_CHUNK_ID
          value: "chunk-0"
        - name: RENDER_S3_BUCKET
          value: "my-render-bucket"
        resources:
          requests:
            cpu: "2"
            memory: "4Gi"
          limits:
            cpu: "4"
            memory: "8Gi"
      restartPolicy: Never
  backoffLimit: 0
`;

export const README_KUBERNETES_TEMPLATE = `# Kubernetes Distributed Rendering

This directory contains the Kubernetes deployment files necessary to run a distributed rendering job on your cluster.

## Prerequisites

1.  A Kubernetes cluster
2.  \`kubectl\` configured to communicate with your cluster
3.  A container registry to host your rendering image
4.  Helios CLI installed locally

## Files

*   \`job.yaml\`: The Kubernetes Job manifest. You can modify this file to adjust resources, add secrets (like AWS credentials for S3 uploads), or change the image name.

## Usage

### 1. Build and Push the Image

First, you need to containerize your project. If you haven't already, run \`helios deploy setup\` to generate a \`Dockerfile\`.

\`\`\`bash
# Build the image
docker build -t your-registry/helios-renderer:latest .

# Push to your registry
docker push your-registry/helios-renderer:latest
\`\`\`

*Don't forget to update the \`image\` field in \`job.yaml\` with your actual registry URL.*

### 2. Configure the Adapter

The Kubernetes Adapter relies on the Kubernetes API to orchestrate jobs. By default, it uses your local \`~/.kube/config\`.

If you're running the Helios CLI outside the cluster, ensure your local environment is configured.
If you're running the CLI *inside* the cluster (e.g. from another Pod), the adapter will automatically pick up the in-cluster service account credentials.

### 3. Run the Distributed Job

Use the \`helios job run\` command and specify the \`kubernetes\` adapter.

\`\`\`bash
helios job run output/job.json \\
  --adapter kubernetes \\
  --image your-registry/helios-renderer:latest \\
  --namespace default \\
  --concurrency 4
\`\`\`

The adapter will automatically create temporary Kubernetes Jobs based on the chunks defined in your \`job.json\`.

## Customization

To customize the temporary jobs created by the CLI (e.g., adding specific NodeSelectors, Tolerations, or mounting persistent volumes), you'll need to pass those configurations down to the worker jobs.

Currently, the \`KubernetesAdapter\` programmatically generates the Job manifests based on the CLI arguments. If you need advanced customization beyond what the CLI exposes, you might need to write a custom script that instantiates the \`KubernetesAdapter\` with specific parameters or modifies the generated Jobs.
`;
