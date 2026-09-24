# Integration validation

Verified locally on 2026-09-08. No public listener, account publication, or
customer data mutation was used.

## Behavioral evidence

The acceptance contract is [the Given/When/Then spec](../../docs/specs/kody-render-workflow.md).
Tests were added before the corresponding implementations. Red checks included
missing lifecycle operations, missing startup support, late cancellation,
failed-render decoding, dynamic local Origin handling, and concurrent session
initialization exceeding the configured cap.

The real render exposed additional failures that queue mocks could not detect:

- Raw `/@fs` HTML left imports unresolved. User-project renders now use Vite's
  transformed composition route.
- Reusing an already-enabled CDP Runtime left the seek driver's context list
  empty. The driver now refreshes Runtime context discovery.
- Flooring fractional frame calculations selected frame 6 for requested frame
  7 at 24 fps, causing incorrect images and stability waits. Seeking rounds to
  the requested frame.

## Passing checks

- Studio server behavior: 94 tests across 16 suites, including real MCP SDK
  Streamable HTTP and SSE sessions, authentication/Host/Origin rejection,
  session ownership, expiration/capacity, output range reads, symlinks, unknown
  jobs, wait expiry, and cancellation.
- CLI Studio command: 9 tests, including project ownership, separate listener
  configuration, and incomplete configuration rejection.
- Kody package workflow/app: 4 behavioral suites for success, retries, progress,
  errors, ownership, range playback, and package-context entry.
- Kody's actual `authoredPackageJsonSchema` accepts the provider package.
- Real-browser shared-session seeking regression plus existing seek-driver
  determinism, offset, and stability scripts.
- Core, Player, Renderer, Infrastructure, Studio, and CLI builds; Studio's
  TypeScript/lint gate. No internal package versions were synchronized.
- Six targeted mutation checks killed authentication, Host-validation,
  session-owner, output-path, package-owner, and late-cancellation mutants.
  This is targeted mutation coverage, not a repository-wide mutation score.
- Kody focused guide/catalog/downstream-MCP checks: 3 suites, 6 tests. Exact
  changed-file Oxfmt and Mermaid checks passed.

## Actual demo

`verify-local.mts` runs the same package workflow over a real SDK transport,
Vite, Chromium, and FFmpeg. It verifies identical output bytes through the
package's MCP reads and the provider HTTP route, decodes frames to reject
black/frozen output, plays and seeks the video through the package app, then
exercises an actual browser render error and cancellation.

The verified silent demo is H.264, 1280×720, 24 fps, 192 frames, 8.000 seconds.
The MP4 and playback screenshot are saved outside the repository and were shown
to the owner. Reproduce with the command in the provider guide.

## Remaining installation checks

Public DNS/TLS and proxy behavior, a real OS secret-store credential paired with
Kody's account form, signed-in hosted Kody invocation/playback, cross-account
hosted access, and reconnect across a public proxy remain unverified. The local
fixture identity and isolated package store do not establish these live facts.

Kody's authoritative `npm run validate` was attempted with Node 26.8.1 and
npm 11.11.1 after a successful isolated install. Its E2E web server timed out
after 180 seconds; the remaining broad run was stopped. The full gate is not
green. No release, merge, upstream submission, or reviewer request is implied.
