import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { ObjectStore, StoredObject, ByteSource, safeKey } from './storage.js';
import { RenderError } from './plan.js';

/** Inject a configured client; credentials remain with the host's provider. */
export class S3Store implements ObjectStore {
  constructor(private client: S3Client, private bucket: string, private prefix = 'helios/') {
    if (!bucket || !/^[a-zA-Z0-9/_-]*$/.test(prefix)) throw new Error('Invalid S3 store configuration');
  }
  private key(key: string) { return this.prefix + safeKey(key); }
  async get(key: string): Promise<StoredObject | undefined> {
    const input = { Bucket: this.bucket, Key: this.key(key) };
    let head;
    try { head = await this.client.send(new HeadObjectCommand(input)); }
    catch (error) { if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return undefined; throw error; }
    if (!head.ETag || head.ContentLength === undefined) throw new RenderError('STORAGE_ERROR', 'Object store omitted required metadata', 503);
    if (head.ContentLength <= 8 * 1024 * 1024) {
      const result = await this.client.send(new GetObjectCommand(input));
      if (!result.Body || !result.ETag) throw new RenderError('STORAGE_ERROR', 'Object store returned no body', 503);
      const bytes = await result.Body.transformToByteArray();
      if (bytes.length > 8 * 1024 * 1024) throw new RenderError('RESOURCE_LIMIT', 'Small object changed beyond its size bound');
      return { version: result.ETag, size: bytes.length, stream: async function* (range) { yield range ? bytes.subarray(range.start, range.end + 1) : bytes; } };
    }
    const client = this.client, version = head.ETag;
    return { version, size: head.ContentLength, stream: async function* (range) {
      const result = await client.send(new GetObjectCommand({ ...input, IfMatch: version, ...(range ? { Range: `bytes=${range.start}-${range.end}` } : {}) }));
      if (!result.Body) throw new RenderError('STORAGE_ERROR', 'Object store returned no body', 503);
      yield* result.Body as AsyncIterable<Uint8Array>;
    } };
  }
  async put(key: string, body: ByteSource, expected: string | null, bytes?: number): Promise<boolean> {
    const length = body instanceof Uint8Array ? body.length : bytes;
    if (length === undefined || !Number.isSafeInteger(length) || length < 0) throw new RenderError('STORAGE_ERROR', 'Streaming uploads require a known content length', 500);
    try {
      await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: this.key(key), Body: body instanceof Uint8Array ? body : Readable.from(body), ContentLength: length, ...(expected === null ? { IfNoneMatch: '*' } : { IfMatch: expected }) }));
      return true;
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 409 || status === 412) return false;
      throw error;
    }
  }
  async *list(prefix: string): AsyncIterable<string> {
    let cursor: string | undefined;
    do {
      const page = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: this.prefix + prefix, ContinuationToken: cursor }));
      for (const object of page.Contents ?? []) if (object.Key) yield object.Key.slice(this.prefix.length);
      cursor = page.IsTruncated ? page.NextContinuationToken : undefined;
      if (page.IsTruncated && !cursor) throw new RenderError('STORAGE_ERROR', 'Object listing omitted a continuation token', 503);
    } while (cursor);
  }
}
