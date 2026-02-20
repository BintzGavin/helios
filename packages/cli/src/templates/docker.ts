export const DOCKERFILE_TEMPLATE = `# Base image
FROM node:18-slim

# Install dependencies for Puppeteer (Chromium) and FFmpeg
RUN apt-get update && apt-get install -y \\
    ffmpeg \\
    chromium \\
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \\
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \\
    HELIOS_BROWSER_ARGS="--no-sandbox --disable-setuid-sandbox"

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the project (if applicable)
RUN npm run build --if-present

# Default command to run when container starts
CMD ["npm", "run", "render"]
`;

export const DOCKER_COMPOSE_TEMPLATE = `version: '3.8'

services:
  helios-render:
    build: .
    volumes:
      - ./output:/app/output
    environment:
      - HELIOS_BROWSER_ARGS=--no-sandbox --disable-setuid-sandbox
    # Overwrite the command if needed
    # command: npm run render -- --output output/video.mp4
`;
