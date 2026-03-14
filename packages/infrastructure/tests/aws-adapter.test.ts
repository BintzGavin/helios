import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { AwsLambdaAdapter } from '../src/adapters/aws-adapter.js';

describe('AwsLambdaAdapter', () => {
  const lambdaMock = mockClient(LambdaClient);

  beforeEach(() => {
    lambdaMock.reset();
  });

  it('should successfully invoke lambda and return output', async () => {
    const adapter = new AwsLambdaAdapter({
      region: 'us-east-1',
      functionName: 'test-function',
      jobDefUrl: 'https://example.com/job.json'
    });

    const mockResponsePayload = JSON.stringify({
      statusCode: 200,
      body: JSON.stringify({
        message: 'Render complete',
        output: 'Success output'
      })
    });

    lambdaMock.on(InvokeCommand).resolves({
      StatusCode: 200,
      Payload: new TextEncoder().encode(mockResponsePayload)
    });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('Success output');

    // Verify invocation arguments
    const calls = lambdaMock.commandCalls(InvokeCommand);
    expect(calls.length).toBe(1);

    const input = calls[0].args[0].input;
    expect(input.FunctionName).toBe('test-function');

    const payload = JSON.parse(new TextDecoder().decode(input.Payload));
    expect(payload).toEqual({
      jobPath: 'https://example.com/job.json',
      chunkIndex: 1
    });
  });

  it('should use job.meta.jobDefUrl when provided instead of config', async () => {
    const adapter = new AwsLambdaAdapter({
      region: 'us-east-1',
      functionName: 'test-function',
      jobDefUrl: 'https://default.com/job.json' // Should be overridden
    });

    lambdaMock.on(InvokeCommand).resolves({
      StatusCode: 200,
      Payload: new TextEncoder().encode(JSON.stringify({ statusCode: 200, body: JSON.stringify({ output: 'Success' }) }))
    });

    await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1, jobDefUrl: 'https://dynamic.com/job.json' }
    });

    const calls = lambdaMock.commandCalls(InvokeCommand);
    expect(calls.length).toBe(1);

    const payload = JSON.parse(new TextDecoder().decode(calls[0].args[0].input.Payload));
    expect(payload.jobPath).toBe('https://dynamic.com/job.json');
  });

  it('should throw if neither job.meta.jobDefUrl nor config.jobDefUrl is set', async () => {
    const adapter = new AwsLambdaAdapter({
      region: 'us-east-1',
      functionName: 'test-function',
    });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('AwsLambdaAdapter requires job.meta.jobDefUrl or config.jobDefUrl to be set');
  });

  it('should handle lambda application error (non-200 status code)', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    const mockResponsePayload = JSON.stringify({
      statusCode: 500,
      body: JSON.stringify({
        message: 'Render failed',
        error: 'Something went wrong'
      })
    });

    lambdaMock.on(InvokeCommand).resolves({
      StatusCode: 200, // Lambda invoked successfully, but function returned error
      Payload: new TextEncoder().encode(mockResponsePayload)
    });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 2 }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Render failed');
  });

  it('should handle AWS infrastructure error (FunctionError)', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    const errorPayload = JSON.stringify({
      errorMessage: 'Unhandled exception',
      errorType: 'RuntimeError'
    });

    lambdaMock.on(InvokeCommand).resolves({
      StatusCode: 200,
      FunctionError: 'Unhandled',
      Payload: new TextEncoder().encode(errorPayload)
    });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 3 }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Unhandled exception');
  });

  it('should throw if chunkId is missing in meta', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    await expect(adapter.execute({
      command: 'ignored',
      meta: {} // Missing chunkId
    })).rejects.toThrow('chunkId');
  });

  it('should gracefully handle client.send throwing an error', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    lambdaMock.on(InvokeCommand).rejects(new Error('Network failure'));

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Network failure');
  });

  it('should handle empty Payload in success response', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    lambdaMock.on(InvokeCommand).resolves({
      StatusCode: 200,
      // Missing Payload entirely
    });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('should handle malformed JSON in Payload', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    lambdaMock.on(InvokeCommand).resolves({
      StatusCode: 200,
      Payload: new TextEncoder().encode('Invalid JSON')
    });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Failed to parse Lambda response');
    expect(result.stdout).toBe('Invalid JSON');
  });

  it('should handle malformed JSON error payload (FunctionError with bad JSON)', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    lambdaMock.on(InvokeCommand).resolves({
      StatusCode: 200,
      FunctionError: 'Unhandled',
      Payload: new TextEncoder().encode('Bad Error JSON')
    });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Lambda execution failed: Bad Error JSON');
  });

  it('should handle successful response with raw payload (no body)', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    const mockResponsePayload = JSON.stringify({
      message: 'Just some raw output, no body wrapper'
    });

    lambdaMock.on(InvokeCommand).resolves({
      StatusCode: 200,
      Payload: new TextEncoder().encode(mockResponsePayload)
    });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Just some raw output');
  });

  it('should throw if job.meta.jobDefUrl is undefined, config.jobDefUrl is undefined, and job.meta.chunkId is defined', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function'
    });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('AwsLambdaAdapter requires job.meta.jobDefUrl or config.jobDefUrl to be set');
  });

  it('should handle lambda application error where JSON.parse fails on payload', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    const errorPayload = 'Invalid Error JSON';

    lambdaMock.on(InvokeCommand).resolves({
      StatusCode: 200,
      FunctionError: 'Unhandled',
      Payload: new TextEncoder().encode(errorPayload)
    });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Lambda execution failed: Invalid Error JSON');
  });

  it('should handle successful execution where result.body exists but does NOT contain an output property', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    const mockResponsePayload = JSON.stringify({
      statusCode: 200,
      body: JSON.stringify({
        message: 'Render complete'
      })
    });

    lambdaMock.on(InvokeCommand).resolves({
      StatusCode: 200,
      Payload: new TextEncoder().encode(mockResponsePayload)
    });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('should handle result.statusCode NOT 200 and body.message is missing', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    const mockResponsePayload = JSON.stringify({
      statusCode: 500,
      body: JSON.stringify({
        error: 'Something went wrong'
      })
    });

    lambdaMock.on(InvokeCommand).resolves({
      StatusCode: 200,
      Payload: new TextEncoder().encode(mockResponsePayload)
    });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('Lambda returned non-200 status code');
  });

  it('should handle malformed JSON in success payload with partial stdout', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    // We can simulate a payload that causes JSON.parse(payloadStr) to fail on line 102
    lambdaMock.on(InvokeCommand).resolves({
      StatusCode: 200,
      Payload: new TextEncoder().encode('Invalid JSON Success')
    });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Failed to parse Lambda response');
    expect(result.stdout).toBe('Invalid JSON Success');
  });

  it('should handle FunctionError with valid JSON payload containing errorMessage', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    lambdaMock.on(InvokeCommand).resolves({
      StatusCode: 200,
      FunctionError: 'Unhandled',
      Payload: new TextEncoder().encode(JSON.stringify({ errorMessage: 'Specific error from lambda' }))
    });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Lambda execution failed: Specific error from lambda');
  });

  it('should handle FunctionError with valid JSON payload missing errorMessage', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    const payloadObj = { customErrorDetail: 'Something else' };
    lambdaMock.on(InvokeCommand).resolves({
      StatusCode: 200,
      FunctionError: 'Unhandled',
      Payload: new TextEncoder().encode(JSON.stringify(payloadObj))
    });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Lambda execution failed: {"customErrorDetail":"Something else"}');
  });

  it('should parse body correctly when it is an object (not a string)', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    lambdaMock.on(InvokeCommand).resolves({
      StatusCode: 200,
      Payload: new TextEncoder().encode(JSON.stringify({
        statusCode: 200,
        body: { output: 'Parsed from object body' }
      }))
    });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('Parsed from object body');
  });

  it('should catch error when error object thrown does not have message property', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    // To hit `error.message || 'Unknown error executing Lambda'` when `error.message` is undefined
    lambdaMock.on(InvokeCommand).rejects(Object.create(null));

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('Unknown error executing Lambda');
  });

  it('should handle FunctionError when response.Payload is not defined', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    lambdaMock.on(InvokeCommand).resolves({
      StatusCode: 200,
      FunctionError: 'Unhandled'
      // Payload is explicitly undefined by mock
    });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Lambda execution failed: Unknown Lambda Error');
  });

  it('should preserve stdout if already set when a parsing error occurs later', async () => {
    const adapter = new AwsLambdaAdapter({
      functionName: 'test-function',
      jobDefUrl: 'job.json'
    });

    const originalParse = JSON.parse;
    try {
      // Monkey patch JSON.parse to return an object with a getter that throws
      // when `message` is accessed, AFTER `output` has already been read.
      JSON.parse = (text: string) => {
        const obj = originalParse(text);
        if (obj && obj.body && obj.body.output === 'set_stdout_then_throw') {
           Object.defineProperty(obj.body, 'message', {
             get: () => { throw new Error('Simulated error after stdout is set'); }
           });
        }
        return obj;
      };

      lambdaMock.on(InvokeCommand).resolves({
        StatusCode: 200,
        Payload: new TextEncoder().encode(JSON.stringify({
          statusCode: 500, // triggers reading `message`
          body: {
            output: 'set_stdout_then_throw' // sets stdout
          }
        }))
      });

      const res = await adapter.execute({
        command: 'ignored',
        meta: { chunkId: 1 }
      });

      expect(res.exitCode).toBe(1);
      expect(res.stdout).toBe('set_stdout_then_throw'); // verified stdout was preserved!
      expect(res.stderr).toContain('Simulated error after stdout is set');
    } finally {
      JSON.parse = originalParse;
    }
  });
});
