FROM node:22-bookworm-slim AS codecs
RUN apt-get update && apt-get install -y --no-install-recommends build-essential pkg-config libx264-dev zlib1g-dev curl ca-certificates xz-utils && rm -rf /var/lib/apt/lists/*
WORKDIR /build
RUN curl -fL https://ffmpeg.org/releases/ffmpeg-8.0.1.tar.xz -o ffmpeg.tar.xz && echo "05ee0b03119b45c0bdb4df654b96802e909e0a752f72e4fe3794f487229e5a41  ffmpeg.tar.xz" | sha256sum -c - && tar -xf ffmpeg.tar.xz
COPY build-codecs.sh ./build-codecs.sh
RUN bash build-codecs.sh /build/ffmpeg-8.0.1 /opt/codecs 4

FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libx264-164 zlib1g ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=codecs /opt/codecs/bin/ffmpeg /usr/local/bin/ffmpeg
COPY --from=codecs /opt/codecs/bin/ffprobe /usr/local/bin/ffprobe
COPY --from=codecs /build/ffmpeg-8.0.1/COPYING.GPLv2 /usr/share/doc/helios-codecs/COPYING.GPLv2
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force
COPY dist ./dist
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 8787
ENTRYPOINT ["node", "dist/cli.js"]
CMD ["serve", "--host", "0.0.0.0", "--trusted-network", "--data", "/data", "--port", "8787"]
