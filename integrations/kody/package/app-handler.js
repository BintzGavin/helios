// Keep the saved package private: Kody authenticates its owner before ingress.
export function createApp(workflow, getContext) {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      const api = workflow();
      const packageContext = getContext();
      if (packageContext?.hostedUrl) await api.configure({ appUrl: packageContext.hostedUrl });
      if (request.method === 'POST' && ['/start', '/cancel'].includes(url.pathname)) {
        if (
          request.headers.get('Kody-Synthetic') !== 'true' &&
          request.headers.get('origin') !== url.origin
        )
          return new Response('Untrusted origin', { status: 403 });
        try {
          const body = await request.text();
          if (body.length > 4096) return new Response('Brief too large', { status: 413 });
          const input = JSON.parse(body);
          return Response.json(
            await (url.pathname === '/start' ? api.start(input) : api.cancel(input)),
            { headers: { 'Cache-Control': 'no-store' } },
          );
        } catch (error) {
          return Response.json({ error: error.message }, { status: 400 });
        }
      }
      if (!['GET', 'HEAD'].includes(request.method))
        return new Response('Method not allowed', { status: 405 });
      const match = /^\/(watch|status|video)\/([a-zA-Z0-9-]{1,100})$/.exec(url.pathname);
      if (!match)
        return new Response(
          'Use POST /start through packageAppFetch to create a video, then open its playback URL.',
          { headers: { 'Content-Type': 'text/plain' } },
        );
      const [, route, jobId] = match;
      try {
        if (route === 'video') return await api.video(request, jobId);
        const status = await api.status({ jobId });
        if (route === 'status')
          return Response.json(status, { headers: { 'Cache-Control': 'no-store' } });
        if (!packageContext?.hostedUrl) throw new Error('Package app context is required.');
        const base = packageContext.appBasePath;
        const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Helios video</title><style>body{margin:0;background:#0c1622;color:#f2f0df;font:18px system-ui;padding:6vw}main{max-width:1080px;margin:auto}h1{font-size:clamp(30px,5vw,60px);margin-bottom:12px}p{color:#b5c7bc}video{width:100%;border-radius:12px}progress{accent-color:#d8f5a2;width:100%}a{color:#d8f5a2}</style></head><body><main><p>HELIOS / KODY</p><h1>Your idea, in motion.</h1><p id="state">Checking render…</p><progress id="progress" max="1" value="0"></progress><video id="video" controls playsinline hidden></video><p><a href="">Refresh progress</a></p></main><script>
const state=document.getElementById('state'), progress=document.getElementById('progress'), video=document.getElementById('video');let polls=0;
async function check(){try{const r=await fetch(${JSON.stringify(base + '/status/' + jobId)});if(!r.ok)throw new Error('Could not read render progress. Refresh to retry.');const job=await r.json();state.textContent=job.status==='completed'?'Ready to play':job.status;progress.value=job.progress||0;if(job.status==='completed'){progress.hidden=true;video.hidden=false;video.src=${JSON.stringify(base + '/video/' + jobId)};return;}if(['failed','cancelled'].includes(job.status)){state.textContent=job.error||job.status;return;}if(++polls<120)setTimeout(check,1000);else state.textContent='Still rendering. Refresh to continue checking.';}catch(e){state.textContent=e.message;}}check();
</script></body></html>`;
        return new Response(request.method === 'HEAD' ? null : html, {
          headers: {
            'Content-Type': 'text/html;charset=utf-8',
            'Cache-Control': 'private, no-store',
            'Referrer-Policy': 'no-referrer',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      } catch {
        return new Response('Video unavailable. Check this package’s render status.', {
          status: 404,
        });
      }
    },
  };
}
