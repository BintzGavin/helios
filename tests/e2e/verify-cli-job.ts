import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const CLI_PATH = path.resolve(process.cwd(), 'packages/cli/src/index.ts');
const EXAMPLE_PATH = 'examples/simple-animation/dist/composition.html';
const OUTPUT_DIR = path.resolve(process.cwd(), 'output/verify-job');

async function runHelios(args: string[]) {
    // We use npx tsx to run the cli from source
    const command = `npx tsx ${CLI_PATH} ${args.join(' ')}`;
    console.log(`Running: ${command}`);
    return execAsync(command);
}

async function main() {
    try {
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        const jobFile = path.join(OUTPUT_DIR, 'test-job.json');
        const finalOutput = path.join(OUTPUT_DIR, 'final.mp4');

        // Clean up previous run
        if (fs.existsSync(jobFile)) fs.unlinkSync(jobFile);
        if (fs.existsSync(finalOutput)) fs.unlinkSync(finalOutput);

        // 1. Emit Job
        console.log('\nStep 1: Emitting Job Spec...');
        await runHelios([
            'render',
            EXAMPLE_PATH,
            '--emit-job', jobFile,
            '--output', finalOutput,
            '--duration', '2',
            '--fps', '30',
            '--concurrency', '2',
            '--mode', 'dom'
        ]);

        if (!fs.existsSync(jobFile)) {
            throw new Error(`Job file not generated at ${jobFile}`);
        }

        const jobSpec = JSON.parse(fs.readFileSync(jobFile, 'utf-8'));
        if (jobSpec.chunks.length !== 2) {
            throw new Error(`Expected 2 chunks, got ${jobSpec.chunks.length}`);
        }
        console.log('✅ Job spec verified.');

        // 2. Run Full Job
        console.log('\nStep 2: Running Full Job...');
        await runHelios(['job', 'run', jobFile]);

        if (!fs.existsSync(finalOutput)) {
            throw new Error(`Final output not generated at ${finalOutput}`);
        }
        console.log('✅ Full job execution verified.');

        // 3. Clean up and Test Chunk Execution
        if (fs.existsSync(finalOutput)) fs.unlinkSync(finalOutput);
        const chunk0Path = jobSpec.chunks[0].outputFile;
        // Clean all chunks
        for (const chunk of jobSpec.chunks) {
            if (fs.existsSync(chunk.outputFile)) fs.unlinkSync(chunk.outputFile);
        }

        console.log('\nStep 3: Running Single Chunk...');
        await runHelios([
            'job', 'run', jobFile,
            '--chunk', '0',
            '--no-merge'
        ]);

        if (!fs.existsSync(chunk0Path)) {
            throw new Error(`Chunk 0 output not generated at ${chunk0Path}`);
        }
        // Verify merge did NOT happen
        if (fs.existsSync(finalOutput)) {
             throw new Error(`Merge ran unexpectedly!`);
        }

        console.log('✅ Chunk execution verified.');
        console.log('\n🎉 All tests passed!');

    } catch (err: any) {
        console.error('❌ Test failed:', err.message);
        if (err.stdout) console.log('STDOUT:', err.stdout);
        if (err.stderr) console.error('STDERR:', err.stderr);
        process.exit(1);
    }
}

main();
