# Helios video

## Intent

Turn an explicit short title/explainer brief into a real video. Helios owns the
project, browser, and FFmpeg. This personal Kody package owns the request record,
progress view, and playback through authenticated MCP reads.

## Install

This directory is maintained source for a user package, not an npm package or
an existing community listing. Follow [the integration guide](https://github.com/BintzGavin/helios/blob/gavin/feat-kody-render-workflow/docs/site/guides/kody.md)
to connect Helios and copy these files into a private saved package through
Kody's supported Git authoring lane. Change `@owner` in package.json and examples
to your Kody username. Run repo checks before publishing. Publishing in your
account is a separate owner action; copying source does not install anything.

Name the remote MCP connection `helios`. Open the private app or save its
`hosted_app_url` with the configure export after publish. Keep Studio running.
The package needs no browser, encoder dependencies, or additional secrets.

## Make a video

```js
import configure from 'kody:@owner/helios-video/configure'
import start from 'kody:@owner/helios-video'
import status from 'kody:@owner/helios-video/status'

// Use the actual hosted_app_url returned by your package publish.
await configure({ appUrl: 'https://owner.kody.run/packages/helios-video' })
const job = await start({
  requestId: 'welcome-1',
  template: 'title-explainer',
  title: 'Make an idea move.',
  subtitle: 'One brief. A composition. A finished film.',
  duration: 8,
})
return await status({ jobId: job.jobId, waitMs: 1000 })
```

Open the returned `playbackUrl`: it displays progress and then a normal video
player. `completed` means actual MP4 bytes exist. A wait timeout leaves the
render running; resume with status and the same job ID. Repeating start with
the same request ID and brief returns the recorded job. After an uncertain
start failure, inspect Studio before using a new request ID. Start is not an
exactly-once distributed transaction.

The title template is 1280×720 at 24 fps, with 2–30 second duration, a title of
up to 100 characters, and a subtitle of up to 85. Playback streams chunks and
supports seeking and HEAD; output is capped at 64 MiB. This is an explicit
template workflow, not arbitrary generated composition code.

Kody authenticates the app owner. Keep the saved package private and grant the
`helios` connector to this package using Specific packages only. Run starts in
the package context when using that lock (an imported function in ad hoc
execute does not change the calling package context). See the integration
guide for `packageAppFetch` use with the locked connection.

Use a separate Studio process, project root, and dedicated OS secret-store
entry per owner. Sharing one Studio credential across Kody users shares the
entire project and is unsupported.
