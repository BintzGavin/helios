# Helios video agent runbook

Use `start`, `status`, and `cancel` from this package's declared exports. Always
choose `template: 'title-explainer'` explicitly. Obtain `playbackUrl` from the
result; do not invent a provider URL or put a credential in a link.

`runtime.js` uses `kody.mcp['helios']` and `packageStorage()`. The provider's JSON
text blocks arrive through Kody's `__mcpContent` and `__mcpIsError` markers.
Do not treat a failed render's `error` field as a transport failure.

Before using a locked MCP connection, enter the package through its private app
or an existing package workflow/job. Static imports from execute retain the
execute context. The app exposes same-origin POST /start and POST /cancel.

Smoke tests: configure with the actual hosted_app_url, start a uniquely named
eight-second sample, inspect status, open playback, seek, and cancel a second
sample. Report queued, failed, cancelled, and timeout accurately. Never retry an
incomplete start blindly. Do not pass arbitrary paths to output operations.

Maintain per-user package storage and private app access. Never supervise local
processes inside Kody. Never publish a community listing or change visibility
without the owner's explicit authorization.
