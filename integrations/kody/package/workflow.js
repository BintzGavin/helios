// Runtime-independent workflow, shared by exports, the app, and the local demo.
function unwrap(result) {
  const blocks = result.__mcpContent ?? result.content;
  let value = result.__mcpStructuredContent ?? result.structuredContent;
  if (!value && blocks) {
    const text = blocks.find((block) => block.type === 'text')?.text;
    try {
      value = JSON.parse(text);
    } catch {
      throw new Error(text || 'Malformed MCP response');
    }
  }
  value ??= result;
  if (result.__mcpIsError || result.isError)
    throw new Error(value.error || value.code || 'Helios operation failed');
  return value;
}
const validId = (value) => typeof value === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(value);
export function createWorkflow(mcp, storage) {
  const call = async (tool, args) => unwrap(await mcp[tool](args));
  const owned = async (id) => {
    const job = validId(id) && (await storage.get(`job:${id}`));
    if (!job) throw new Error('Render job not found in this package.');
    return job;
  };
  const link = async (jobId) => {
    const config = await storage.get('config');
    return config?.appUrl ? `${config.appUrl}/watch/${jobId}` : undefined;
  };
  const api = {
    async configure({ appUrl }) {
      const url = new URL(appUrl);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
        throw new Error('Use the HTTPS hosted_app_url returned by package publish.');
      const config = { appUrl: url.href.replace(/\/$/, '') };
      await storage.set('config', config);
      return config;
    },
    async start(input) {
      if (input.template !== 'title-explainer')
        throw new Error('Choose the explicit title-explainer template.');
      if (!validId(input.requestId))
        throw new Error('Use a unique requestId of 1–100 letters, digits, or hyphens.');
      if (
        typeof input.title !== 'string' ||
        input.title.length < 1 ||
        input.title.length > 100 ||
        typeof input.subtitle !== 'string' ||
        input.subtitle.length > 85
      )
        throw new Error('Brief needs a title (1–100 characters) and subtitle (0–85 characters).');
      const duration = input.duration ?? 8;
      if (!Number.isFinite(duration) || duration < 2 || duration > 30)
        throw new Error('Duration must be 2–30 seconds.');
      const brief = {
        template: input.template,
        title: input.title,
        subtitle: input.subtitle,
        duration,
      };
      const key = `request:${input.requestId}`;
      const previous = await storage.get(key);
      if (previous) {
        if (JSON.stringify(previous.brief) !== JSON.stringify(brief))
          throw new Error('requestId already belongs to a different brief.');
        if (!previous.jobId)
          throw new Error(
            'Previous start is incomplete. Inspect Studio before using a new requestId.',
          );
        return { ...previous, playbackUrl: await link(previous.jobId) };
      }
      // Reserve before mutations. An uncertain failure is never retried blindly.
      await storage.set(key, { brief, status: 'starting' });
      const composition = await call('create_composition', {
        name: `kody-${input.requestId}`,
        template: input.template,
        width: 1280,
        height: 720,
        fps: 24,
        duration,
        defaultProps: { title: input.title, subtitle: input.subtitle },
      });
      // DOM capture uses Helios's stateless seek driver, including for this
      // Canvas artwork. It avoids document-clock offsets during page loading.
      const render = await call('render_composition', {
        compositionId: composition.id,
        mode: 'dom',
        videoCodec: 'libx264',
      });
      if (!validId(render.jobId)) throw new Error('Helios returned an invalid job ID.');
      const record = {
        brief,
        compositionId: composition.id,
        jobId: render.jobId,
        status: render.status,
      };
      await storage.set(`job:${render.jobId}`, record);
      await storage.set(key, record);
      return { ...record, playbackUrl: await link(render.jobId) };
    },
    async status({ jobId, waitMs = 0 }) {
      await owned(jobId);
      if (!Number.isInteger(waitMs) || waitMs < 0 || waitMs > 10000)
        throw new Error('waitMs must be 0–10000.');
      const status = await call('get_render_status', { jobId, waitMs });
      const output =
        status.status === 'completed' ? await call('get_render_output', { jobId }) : undefined;
      return { ...status, output, playbackUrl: await link(jobId) };
    },
    async cancel({ jobId }) {
      await owned(jobId);
      return call('cancel_render', { jobId });
    },
    async video(request, jobId) {
      await owned(jobId);
      const status = await call('get_render_status', { jobId });
      if (status.status !== 'completed') throw new Error('Render has not completed.');
      const output = await call('get_render_output', { jobId });
      const size = output.size;
      if (!Number.isSafeInteger(size) || size <= 0 || size > 64 * 1024 * 1024)
        throw new Error('Video exceeds the package playback limit of 64 MiB.');
      let start = 0;
      let end = size - 1;
      const range = request.headers.get('range');
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2])) start = size;
        else if (!match[1]) start = Math.max(0, size - Number(match[2]));
        else {
          start = Number(match[1]);
          if (match[2]) end = Math.min(end, Number(match[2]));
        }
        if (
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end) ||
          start > end ||
          start >= size
        )
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${size}` },
          });
      }
      const headers = {
        'Content-Type': 'video/mp4',
        'Content-Length': String(end - start + 1),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
      };
      let offset = start;
      const stream =
        request.method === 'HEAD'
          ? null
          : new ReadableStream({
              async pull(controller) {
                try {
                  const length = Math.min(65536, end - offset + 1);
                  const chunk = await call('read_render_output', { jobId, offset, length });
                  const data = Uint8Array.from(atob(chunk.data), (c) => c.charCodeAt(0));
                  if (
                    data.length !== length ||
                    chunk.nextOffset !== offset + length ||
                    chunk.size !== size
                  )
                    throw new Error('Invalid video chunk from Helios.');
                  controller.enqueue(data);
                  offset += length;
                  if (offset > end) controller.close();
                } catch (error) {
                  controller.error(error);
                }
              },
            });
      return new Response(stream, { status: range ? 206 : 200, headers });
    },
  };
  return api;
}
