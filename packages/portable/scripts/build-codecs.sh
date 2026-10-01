#!/usr/bin/env bash
# Build from a verified FFmpeg source directory; requires C compiler, make,
# pkg-config, x264 development headers/library and zlib development headers.
# No network, credential handling or process-environment inspection.
set -euo pipefail
task_source=${1:?Supply the FFmpeg source directory}
task_prefix=${2:?Supply the installation directory}
task_jobs=${3:-4}
[[ "$task_jobs" =~ ^[1-9][0-9]?$ ]] || exit 1
cd "$task_source"
./configure \
  --prefix="$task_prefix" --disable-doc --disable-debug --disable-autodetect \
  --disable-everything --disable-network --disable-x86asm --disable-ffplay \
  --enable-ffmpeg --enable-ffprobe --enable-gpl --enable-libx264 --enable-zlib \
  --enable-protocol=file,pipe \
  --enable-demuxer=mov,wav,concat,image2,image_png_pipe,image_jpeg_pipe,rawvideo,pcm_f32le \
  --enable-muxer=mp4,mov,image2pipe,rawvideo,pcm_f32le,null \
  --enable-decoder=h264,aac,rawvideo,png,mjpeg,pcm_s16le,pcm_s24le,pcm_s32le,pcm_f32le \
  --enable-encoder=libx264,aac,png,rawvideo,pcm_f32le \
  --enable-parser=h264,aac,png,mjpeg \
  --enable-bsf=h264_mp4toannexb,aac_adtstoasc,extract_extradata \
  --enable-filter=scale,format,colorspace,aresample,aformat,anull,null
make -j "$task_jobs"
make install
"$task_prefix/bin/ffmpeg" -version
"$task_prefix/bin/ffprobe" -version
