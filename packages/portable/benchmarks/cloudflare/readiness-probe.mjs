export const BASELINE_HTML_SHA256 = 'e24332e35e5e10e1e2f37f23a010226a3dc047e44274164c6e17064e3779b58e';

export async function readReadinessFailure(sandbox) {
  const result = { status: 'failed', stage: 'unknown', category: 'unknown', round: null, mode: null, exitCode: null };
  try {
    const file = await sandbox.readFile('/workspace/helios-cpu/readiness-failure.json');
    if (!file.success || typeof file.content !== 'string' || file.content.length > 4096) return result;
    const value = JSON.parse(file.content);
    if (['preparation', 'render', 'verification', 'pixel-equality', 'archive'].includes(value.stage)) result.stage = value.stage;
    if (['command-failed', 'metadata-mismatch', 'motion-mismatch', 'decode-incomplete', 'pixels-changed', 'size-limit', 'unknown'].includes(value.category)) result.category = value.category;
    if ([0, 1].includes(value.round)) result.round = value.round;
    if (['fixed-delay', 'ready'].includes(value.mode)) result.mode = value.mode;
    if (Number.isInteger(value.exitCode) && value.exitCode >= 0 && value.exitCode <= 255) result.exitCode = value.exitCode;
  } catch { /* Missing bounded diagnostics remain explicitly unknown. */ }
  return result;
}

export function validateReadinessProbe(report) {
  if (report?.status !== 'qualified' || report.htmlSha256 !== BASELINE_HTML_SHA256 || report.gpuDevicePresent !== false || report.platform !== 'linux' || !Number.isInteger(report.logicalCpus) || report.logicalCpus < 1 || report.outputs?.length !== 4) throw new Error('Invalid DOM readiness evidence');
  if (!Number.isInteger(report.evidenceArchive?.bytes) || report.evidenceArchive.bytes < 1 || report.evidenceArchive.bytes > 32 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(report.evidenceArchive.sha256)) throw new Error('Invalid bounded DOM archive');
  const seen = new Set();
  let reference;
  for (const output of report.outputs) {
    const key = `${output.round}:${output.mode}`;
    if (![0, 1].includes(output.round) || !['fixed-delay', 'ready'].includes(output.mode) || seen.has(key)) throw new Error('Incomplete DOM readiness pairs');
    seen.add(key);
    if (!Number.isFinite(output.renderMs) || output.renderMs <= 0 || !Number.isFinite(output.verificationMs) || output.verificationMs <= 0) throw new Error('Invalid DOM readiness timings');
    if (output.width !== 1280 || output.height !== 720 || output.fps !== '24/1' || output.duration !== 10 || output.codec !== 'h264' || output.pixelFormat !== 'yuv420p' || output.frameHashes?.length !== 240 || output.motionVerifiedFrames !== 240 || !/^[a-f0-9]{64}$/.test(output.videoSha256)) throw new Error('Incomplete DOM readiness video');
    if (output.frameHashes.some(hash => typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash))) throw new Error('Invalid DOM frame hashes');
    reference ??= output.frameHashes;
    if (output.frameHashes.some((hash, index) => hash !== reference[index])) throw new Error('DOM readiness changed decoded pixels');
  }
  return report;
}

export async function runReadinessProbe(input, deps) {
  if (typeof input?.runId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,47}$/.test(input.runId)) throw new Error('Invalid readiness probe identifier');
  const html = await deps.loadHtml();
  if (!(html instanceof Uint8Array) || !html.length || html.length > 128 * 1024) throw new Error('Missing bounded baseline HTML');
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', html))].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (digest !== BASELINE_HTML_SHA256) throw new Error('Baseline HTML changed');
  const sandbox = await deps.createSandbox(`helios-readiness-${input.runId}`);
  let result;
  try {
    await deps.execute(sandbox, html);
    const file = await sandbox.readFile('/workspace/helios-cpu/readiness-result.json');
    if (!file.success || file.content.length > 128 * 1024) throw new Error('Missing bounded DOM readiness report');
    result = { ...validateReadinessProbe(JSON.parse(file.content)), runId: input.runId };
    await deps.transfer(`benchmarks/helios-cpu/${input.runId}/evidence.tar.gz`, sandbox);
  } catch (error) {
    await deps.onFailed?.(await readReadinessFailure(sandbox));
    throw error;
  } finally {
    await sandbox.destroy();
  }
  await deps.publish(`benchmarks/helios-cpu/${input.runId}/result.json`, result);
  await deps.onQualified?.({ runId: input.runId, status: 'qualified', outputs: 4 });
  return result;
}
