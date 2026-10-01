import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

describe('benchmark compact evidence retention', () => {
  it('enforces admission, capability, attestation and legacy compatibility', () => {
    const source = new URL('../benchmarks/cloudflare/run-remote.mjs', import.meta.url).href;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', String.raw`import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const { runRemoteBenchmark } = await import(process.argv[1]);
function fixture(capable=true,attested=true){
 const bytes=new TextEncoder().encode('source capsule');
 const input={runId:'retention-check',capsuleSha256:createHash('sha256').update(bytes).digest('hex'),workers:2,encoderThreads:1,repeats:1,evidenceRetention:'compact'};
 const events=[],writes=[];
 const report={status:'qualified',qualifiedOutputs:4,sourcePin:'bacfc3c3212d3d9429468435bfdc1ae2a21c7b3b',workload:{frames:300,width:1920,height:1080,fps:30},...(attested?{evidenceRetention:'compact'}:{})};
 const sandbox={writeFile:async(path,content)=>{writes.push({path,content});return {success:true};},exec:async(command)=>{events.push(command);return {success:true,exitCode:0};},readFile:async(path)=>({success:true,content:JSON.stringify(path.endsWith('protocol-version.json')?{checkpointedRounds:true,compactRetention:capable}:report)}),destroy:async()=>{events.push('destroy');}};
 const deps={now:()=>0,loadCapsule:async()=>bytes,createSandbox:async()=>sandbox,publishCandidate:async()=>events.push('candidate'),publishArtifacts:async()=>events.push('artifacts'),publishReport:async()=>events.push('report')};
 return {input,deps,events,writes};
}
const checks=[];
const test=async(name,fn)=>{try{await fn();checks.push({name,passed:true});}catch(e){checks.push({name,passed:false,error:e.message});}};
await test('Invalid retention rejected before any work',async()=>{const f=fixture();let loads=0;f.deps.loadCapsule=async()=>{loads++;return new Uint8Array([1]);};await assert.rejects(runRemoteBenchmark({...f.input,evidenceRetention:'invalid'},f.deps),/retention/i);assert.equal(loads,0);});
await test('Compact option reaches container input',async()=>{const f=fixture();await runRemoteBenchmark(f.input,f.deps);const input=JSON.parse(f.writes.find(x=>x.path.endsWith('input.json')).content);assert.equal(input.evidenceRetention,'compact');});
await test('Legacy capsule rejected before preparation',async()=>{const f=fixture(false);await assert.rejects(runRemoteBenchmark(f.input,f.deps),/compact/i);assert.equal(f.events.some(x=>x.includes('/prepare.py')),false);assert.equal(f.events.at(-1),'destroy');});
await test('Missing compact attestation rejects publication',async()=>{const f=fixture(true,false);await assert.rejects(runRemoteBenchmark(f.input,f.deps),/retention/i);assert.equal(f.events.includes('artifacts'),false);assert.equal(f.events.includes('report'),false);assert.equal(f.events.at(-1),'destroy');});
await test('Default stays compatible with legacy capsule',async()=>{const f=fixture(false,false);delete f.input.evidenceRetention;await runRemoteBenchmark(f.input,f.deps);const input=JSON.parse(f.writes.find(x=>x.path.endsWith('input.json')).content);assert.equal(input.evidenceRetention,undefined);assert.equal(f.events.includes('report'),true);});
console.log(JSON.stringify({checks,passed:checks.every(x=>x.passed)},null,2));if(checks.some(x=>!x.passed))process.exitCode=1;
`, source], { encoding: 'utf8' });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.passed).toBe(true);
    expect(report.checks).toHaveLength(5);
    expect(report.checks.every((check: { passed: boolean }) => check.passed)).toBe(true);
  });

  it('round-trips records and legacy videos without modifying qualified input evidence', () => {
    const source = fileURLToPath(new URL('../benchmarks/cloudflare/retention.py', import.meta.url));
    const result = spawnSync('/usr/bin/python3', ['-B', '-c', String.raw`import importlib.util,json,pathlib,tempfile,tarfile,hashlib,sys
source=pathlib.Path(sys.argv[1])
s=importlib.util.spec_from_file_location('retention',source);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
with tempfile.TemporaryDirectory(prefix='compact-packing-check-') as stage:
 root=pathlib.Path(stage);package=root/'package';evidence=root/'evidence';package.mkdir();evidence.mkdir();paired=evidence/'paired';paired.mkdir();quality=evidence/'quality';quality.mkdir()
 for p in [root/'source-manifest.json',root/'fframes-cpu.lock',package/'package-lock.json']:p.write_text('provenance bytes')
 (paired/'results.json').write_text('{"timer":123.456}')
 (quality/'quality.json').write_text('{"passed":true,"frames":300}')
 (quality/'ssim.txt').write_text(''.join('n:'+str(i)+' Y:1.000000\n' for i in range(1,301)))
 (quality/'psnr.txt').write_text(''.join('n:'+str(i)+' psnr_y:50 psnr_u:45 psnr_v:45\n' for i in range(1,301)))
 first=paired/'helios-medium-0-output.mp4';later=paired/'helios-medium-1-output.mp4';first.write_bytes(b'first video');later.write_bytes(b'later video')
 (evidence/'private.log').write_text('excluded phase logs')
 original={str(p.relative_to(root)):p.read_bytes() for p in root.rglob('*') if p.is_file()}
 for mode in ['compact','full']:
  (root/'qualification.json').write_text(json.dumps({'status':'qualified','evidenceRetention':mode}))
  m.write_archive(root,package,evidence,mode)
  with tarfile.open(root/'evidence.tar.gz') as archive:
   names=set(archive.getnames());required={'qualification.json','source-manifest.json','fframes-cpu.lock','package-lock.json','evidence/paired/results.json','evidence/quality/quality.json','evidence/quality/ssim.txt','evidence/quality/psnr.txt'}
   assert required<=names
   for name in required-{'qualification.json','package-lock.json'}:assert archive.extractfile(name).read()==(root/name).read_bytes()
   assert archive.extractfile('package-lock.json').read()==(package/'package-lock.json').read_bytes()
   assert ('evidence/paired/helios-medium-0-output.mp4' in names)==(mode=='full')
   assert 'evidence/paired/helios-medium-1-output.mp4' not in names and 'evidence/private.log' not in names
   if mode=='compact':assert all(not name.endswith('.mp4') for name in names)
  assert all((root/name).read_bytes()==value for name,value in original.items()),'Input evidence was modified'
 checksum=hashlib.sha256((root/'evidence.tar.gz').read_bytes()).hexdigest()
 try:m.write_archive(root,package,evidence,'invalid')
 except ValueError:pass
 else:raise AssertionError('Invalid mode accepted')
 assert hashlib.sha256((root/'evidence.tar.gz').read_bytes()).hexdigest()==checksum
 (root/'qualification.json').write_text('{"status":"failed","evidenceRetention":"compact"}')
 try:m.write_archive(root,package,evidence,'compact')
 except ValueError:pass
 else:raise AssertionError('Unqualified packing accepted')
 assert hashlib.sha256((root/'evidence.tar.gz').read_bytes()).hexdigest()==checksum
 print(json.dumps({'passed':True,'compactRoundTrip':True,'fullCompatibility':True,'inputEvidenceUnchanged':True,'invalidModeAndUnqualifiedReportRejected':True,'syntheticPackingOnly':True}))
`, source], { encoding: 'utf8' });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ passed: true, compactRoundTrip: true, fullCompatibility: true, inputEvidenceUnchanged: true, invalidModeAndUnqualifiedReportRejected: true });
  });
});
