const PHASES = ['input-validation', 'staging', 'preparation', 'pairedRendering', 'quality', 'artifactTransfer'];
const OPERATIONS = ['validate-input', 'execute:install-interpreter', 'execute:helios-cpu-bootstrap.py', 'execute:prepare.py', 'execute:compare.py', 'execute:qualify.py', 'write:helios-cpu-capsule.tgz', 'write:helios-cpu-bootstrap.py', 'write:input.json', 'read:qualification', 'artifact-server-start', 'artifact-stream', 'artifact-server-stop', 'artifact-transfer-failed', 'cleanup'];
const CATEGORIES = ['unclassified', 'artifact-transfer-failed', 'not a gzip file', 'Invalid capsule member', 'Capsule extraction limit exceeded', 'SyntaxError', 'No such file'];

function parse(text) {
  if (typeof text !== 'string' || text.length > 4096) return {};
  try { return JSON.parse(text) ?? {}; } catch { return {}; }
}
function boundary(value) {
  const result = {};
  if (CATEGORIES.includes(value?.category)) result.category = value.category;
  if (Number.isInteger(value?.exitCode) || value?.exitCode === null) result.exitCode = value.exitCode;
  if (['boolean', 'undefined'].includes(value?.responseSuccessType)) result.responseSuccessType = value.responseSuccessType;
  return result;
}

/** Numeric receipts only; never read compiler logs or process environments. */
export async function readPreparationEvidence(sandbox) {
  const stages = [];
  for (const stage of ['apt-index', 'compiler-tools', 'npm-dependencies', 'portable-build', 'rustup-download', 'rust-toolchain', 'fframes-checkout', 'fframes-pin', 'fframes-build', 'fframes-build-phase']) {
    try {
      const file = await sandbox.readFile(`/workspace/helios-cpu/evidence/${stage}.exit.json`);
      if (!file.success || typeof file.content !== 'string' || file.content.length > 4096) continue;
      const value = parse(file.content);
      if (Number.isInteger(value.exitStatus) && value.exitStatus >= 0 && value.exitStatus <= 255 && Number.isFinite(value.seconds) && value.seconds >= 0) stages.push({ stage, exitStatus: value.exitStatus, seconds: value.seconds });
    } catch { /* Missing stage evidence is unavailable, not a successful exit. */ }
  }
  return { stages };
}
/** Recover only our bounded, controlled journal fields after Workflow replay. */
export async function recoverFailureContext(read, fallback) {
  const [detail, phase, operation] = await Promise.all(['failure-detail.json', 'phase.json', 'operation.json'].map(async name => parse(await read(name))));
  const activePhase = PHASES.includes(detail.phase) && detail.phase !== 'input-validation' ? detail.phase : phase.phase;
  const activeOperation = OPERATIONS.includes(detail.operation) && detail.operation !== 'validate-input' ? detail.operation : operation.operation;
  return {
    phase: [activePhase, detail.phase, fallback.phase].find(value => PHASES.includes(value)) ?? 'input-validation',
    operation: [activeOperation, detail.operation, fallback.operation].find(value => OPERATIONS.includes(value)) ?? 'validate-input',
    boundary: boundary(detail.boundary ?? fallback.boundary),
  };
}
