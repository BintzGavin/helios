import hashlib
import json
import os
import pathlib
import platform
import shutil
import subprocess
from common import ROOT, PACKAGE, EVIDENCE, PIN, run

EVIDENCE.mkdir(exist_ok=True)
resources = {'platform': platform.system(), 'architecture': platform.machine(), 'logicalCpus': os.cpu_count()}
for filename in ['cpu.max', 'memory.max', 'memory.peak']:
    path = pathlib.Path('/sys/fs/cgroup') / filename
    resources[filename] = path.read_text().strip() if path.exists() else None
resources['gpuDevicePresent'] = pathlib.Path('/dev/nvidia0').exists() or pathlib.Path('/dev/dri').exists()
resources['nodeVersion'] = subprocess.check_output(['node', '--version'], text=True).strip()
resources['ffmpegVersion'] = subprocess.check_output(['ffmpeg', '-version'], text=True).splitlines()[0]
(EVIDENCE / 'resources.json').write_text(json.dumps(resources, indent=2))
if resources['platform'] != 'Linux' or resources['gpuDevicePresent']:
    raise RuntimeError('CPU-only Linux resource not established')

run(['apt-get', 'update'], 'apt-index')
run(['apt-get', 'install', '-y', '--no-install-recommends', 'build-essential', 'pkg-config', 'clang', 'cmake', 'nasm', 'libx264-dev', 'libssl-dev', 'git', 'curl'], 'compiler-tools')
run(['npm', 'ci', '--ignore-scripts', '--workspaces=false'], 'npm-dependencies', cwd=PACKAGE)
run(['node', 'node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], 'portable-build', cwd=PACKAGE)

target = {'x86_64': 'x86_64-unknown-linux-gnu', 'aarch64': 'aarch64-unknown-linux-gnu'}.get(platform.machine())
if not target:
    raise RuntimeError('Unsupported Rust compiler architecture')
run(['curl', '--fail', '--location', '--output', str(ROOT / 'rustup-init'), 'https://static.rust-lang.org/rustup/dist/' + target + '/rustup-init'], 'rustup-download')
(ROOT / 'rustup-init').chmod(0o755)
run([str(ROOT / 'rustup-init'), '--default-toolchain', '1.97.1', '--profile', 'minimal', '-y', '--no-modify-path'], 'rust-toolchain')
run(['git', 'clone', 'https://github.com/dmtrKovalenko/fframes.git', str(ROOT / 'fframes')], 'fframes-checkout')
run(['git', '-C', str(ROOT / 'fframes'), 'checkout', PIN], 'fframes-pin')
crate = EVIDENCE / 'fframes-cpu'
crate.mkdir(exist_ok=True)
shutil.copyfile(ROOT / 'fframes-cpu.lock', crate / 'Cargo.lock')
lock_digest = hashlib.sha256((crate / 'Cargo.lock').read_bytes()).hexdigest()
run(['node', '--import', 'tsx', 'benchmarks/fframes.ts', '--prepare-fframes', '--fframes-source', str(ROOT / 'fframes'), '--out', str(EVIDENCE), '--cargo', '/root/.cargo/bin/cargo'], 'fframes-build-phase', cwd=PACKAGE)
if hashlib.sha256((crate / 'Cargo.lock').read_bytes()).hexdigest() != lock_digest:
    raise RuntimeError('Compiler dependency lock changed')
(EVIDENCE / 'preparation.json').write_text(json.dumps({'sourcePin': PIN, 'cargoLockSha256': lock_digest, 'nodeLockSha256': hashlib.sha256((PACKAGE / 'package-lock.json').read_bytes()).hexdigest()}, indent=2))
