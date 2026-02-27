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
});
