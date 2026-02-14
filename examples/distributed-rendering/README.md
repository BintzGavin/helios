# Distributed Rendering Example

This example demonstrates how to use Helios to perform distributed rendering by splitting a render job into chunks and executing them in parallel.

This workflow is ideal for rendering long or complex compositions on multiple machines (e.g., in a cloud environment like AWS Lambda or Google Cloud Run), or simply parallelizing the workload on a single machine.

## Workflow

The distributed rendering process consists of two main steps:

1.  **Generate Job Spec**: Helios analyzes the composition and generates a JSON job specification (`job.json`) that describes how to split the render into smaller chunks.
2.  **Run Job**: A runner (which can be the Helios CLI itself) executes the chunks defined in the job spec.

## Usage

### 1. Build the Project

First, build your composition to a static site. This ensures that all assets and code are bundled and ready for distribution.

```bash
npm install
npm run build
```

This will generate a `dist` directory containing your composition.

### 2. Generate Render Job

Use the `helios render` command with the `--emit-job` flag to generate a job specification instead of rendering immediately.

```bash
npx helios render dist/index.html --emit-job job.json --width 1280 --height 720 --fps 30 --duration 5 --concurrency 4
```

This command:
- Analyzes `dist/index.html`.
- Creates a `job.json` file.
- Splits the 5-second video (150 frames) into 4 chunks (based on concurrency).

### 3. Run the Job

Execute the job using the `helios job run` command.

```bash
npx helios job run job.json
```

This command:
- Reads `job.json`.
- Spawns 4 concurrent worker processes (as specified in the job spec).
- Renders each chunk to a temporary video file.
- Merges the chunks into a final output video using FFmpeg.

## Cloud Execution

In a cloud environment, you would:
1.  Upload the `dist` directory and `job.json` to shared storage (e.g., S3).
2.  Launch worker instances (e.g., Lambda functions).
3.  Each worker pulls a specific chunk from `job.json` and renders it using `helios job run job.json --chunk <id>`.
4.  A final orchestrator merges the results.

## Configuration

You can customize the job generation:

- `--concurrency <n>`: Number of chunks to split the job into.
- `--width`, `--height`, `--fps`: Output resolution and frame rate.
- `--quality`: CRF value for quality control.
