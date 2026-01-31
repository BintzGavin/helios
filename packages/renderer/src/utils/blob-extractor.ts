import { Page } from 'playwright';
import { AudioTrackConfig } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

export interface BlobExtractionResult {
  tracks: AudioTrackConfig[];
  cleanup: () => Promise<void>;
}

export async function extractBlobTracks(page: Page, tracks: AudioTrackConfig[]): Promise<BlobExtractionResult> {
  const updatedTracks: AudioTrackConfig[] = [];
  const tempFiles: string[] = [];

  for (const track of tracks) {
    if (track.path && track.path.startsWith('blob:')) {
      console.log(`[BlobExtractor] Extracting audio from blob: ${track.path}`);

      // Fetch blob content as base64 and type
      const extraction = await page.evaluate(async (blobUrl) => {
        try {
          const response = await fetch(blobUrl);
          const blob = await response.blob();
          return new Promise<{ base64: string, type: string } | { error: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              // result format: "data:application/octet-stream;base64,ABC..."
              const base64 = result.split(',')[1];
              resolve({ base64, type: blob.type });
            };
            reader.onerror = () => resolve({ error: 'Failed to read blob' });
            reader.readAsDataURL(blob);
          });
        } catch (e: any) {
          return { error: e.message };
        }
      }, track.path);

      if ('error' in extraction) {
        console.warn(`[BlobExtractor] Failed to extract blob ${track.path}: ${extraction.error}`);
        updatedTracks.push(track); // Keep original track (it will likely fail in FFmpeg but we shouldn't crash here)
        continue;
      }

      // Determine extension
      let ext = '.wav';
      if (extraction.type === 'audio/mpeg') ext = '.mp3';
      else if (extraction.type === 'audio/ogg') ext = '.ogg';
      else if (extraction.type === 'audio/webm') ext = '.webm';
      else if (extraction.type === 'audio/aac') ext = '.aac';
      else if (extraction.type === 'audio/flac') ext = '.flac';

      // Write to temp file
      const buffer = Buffer.from(extraction.base64, 'base64');
      const tempId = crypto.randomUUID();
      const tempPath = path.join(os.tmpdir(), `helios_blob_${tempId}${ext}`);

      fs.writeFileSync(tempPath, buffer);
      console.log(`[BlobExtractor] Wrote blob content to ${tempPath} (${buffer.length} bytes)`);

      tempFiles.push(tempPath);
      updatedTracks.push({
        ...track,
        path: tempPath
      });

    } else {
      updatedTracks.push(track);
    }
  }

  const cleanup = async () => {
    if (tempFiles.length > 0) {
      console.log(`[BlobExtractor] Cleaning up ${tempFiles.length} temporary files...`);
      for (const file of tempFiles) {
        try {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        } catch (e) {
          console.warn(`[BlobExtractor] Failed to delete temp file ${file}:`, e);
        }
      }
    }
  };

  return {
    tracks: updatedTracks,
    cleanup
  };
}
