export const DOCKER_COMPOSE_ADAPTER_TEMPLATE = `version: '3.8'

services:
  helios-worker:
    build: .
    deploy:
      mode: replicated
      replicas: 4
    environment:
      - HELIOS_BROWSER_ARGS=--no-sandbox --disable-setuid-sandbox
    volumes:
      - ./output:/app/output
    command: npm run render -- --worker
`;

export const README_DOCKER_TEMPLATE = `# Docker Deployment

This project is configured to run distributed rendering workloads using Docker Compose or Docker Swarm.

## Requirements
- Docker
- Docker Compose

## Running Locally (Compose)
1. Build the image: \`docker-compose build\`
2. Start the workers: \`docker-compose up -d --scale helios-worker=4\`
3. Submit a job using the CLI:
   \`helios job run render-job.json --adapter docker\`

## Running in Production (Swarm)
1. Initialize swarm: \`docker swarm init\`
2. Deploy the stack: \`docker stack deploy -c docker-compose.yml helios\`
`;
