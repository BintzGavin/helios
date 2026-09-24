# Helios remote video workflow acceptance contract

One Studio process owns one project and one remote owner. Kody owns the user's
package, invocation state, and private playback app. Helios owns all browser,
filesystem, and encoder work. Sharing a Studio credential between Kody users is
unsupported; use separate processes, roots, and secret-store entries.

- Given an explicit `title-explainer` template and bounded brief, when the
  package starts, then Helios creates a deterministic composition, returns its
  stable ID, submits a render using that composition's metadata, and records a
  stable job ID in the calling package's storage.
- Given a submitted job, when inspected with a bounded wait, then progress and
  queued/rendering/completed/failed/cancelled state are returned. Wait expiry
  leaves the render running and reports `timedOut`. Cancellation remains
  terminal even if the renderer resolves or rejects after abort.
- Given unknown composition/job IDs, unavailable output, invalid dimensions,
  unsafe paths or symlinks, when tools are called, then clear machine-readable
  errors are returned without disclosing local paths or serving other files.
- Given completed output, when requested through MCP or the authorized output
  route, then actual MP4 bytes are available with bounded reads and correct
  HTTP Range/HEAD semantics. Incomplete or empty output is never playable.
- Given no valid authentication, an unapproved Host/Origin, or another owner's
  session, when any remote MCP or output route is requested, then access fails
  closed before routing or file access. Only the dedicated MCP listener may be
  published; Vite, REST editing, and arbitrary files are unreachable there.
- Given concurrent MCP clients, when using Streamable HTTP or legacy SSE, then
  each has a separate server/transport, working session paths, bounded session
  lifetime, and cleanup. Authentication is rechecked for every HTTP request.
- Given the operating-system secret store cannot authenticate, when the remote
  listener starts or handles a request, then it fails closed without printing
  secret-store output. No credentials are passed in CLI arguments or URLs.
- Given the maintained package is installed privately using Kody's supported
  package authoring lane, when a job completes, then its app serves a playable
  video through authenticated MCP reads. Other package stores cannot retrieve
  an unrecorded job. Polling is bounded and resuming never resubmits a render.
- Given an isolated local project and real browser/FFmpeg, when the demo runs
  through MCP and the package workflow, then its actual video bytes are saved
  outside this repository, probed, played, and shown to the owner.

Release gates: behavioral red/green tests, actual SDK transport integration,
real render/output demo, relevant Studio/CLI type and build gates, package
behavior and manifest checks, and Kody guide discovery/format checks. Hosted
TLS, real secret-store pairing, and signed-in Kody execution require an owner
installation and must not be claimed from fixtures.
