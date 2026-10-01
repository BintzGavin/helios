#!/usr/bin/env bash
#
# A wizard — walks a human through a manual procedure step by step.
# Generated with the wizard skill.
# Adapted from https://github.com/mattpocock/skills (MIT License).
#
# Everything above the "STAGES" marker is the wizard library: do not hand-edit
# it. Author the per-step stages below the marker.

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────
# Wizard library — consistent UX. Identical across every generated wizard.
# ──────────────────────────────────────────────────────────────────────────

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3); RED=$(tput setaf 1)
else
  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""; RED=""
fi

# Author sets these two at the top of the stages section.
TOTAL_STAGES=0
TOTAL_MINUTES=0

_STAGE_INDEX=0
_MINUTES_ELAPSED=0
ENV_FILE="${ENV_FILE:-.env}"
WRITTEN_ENV=()
WRITTEN_SECRET=()
SKIPPED=()

# _clear — wipe the terminal so only the current step is on screen. No-op when
# output is not a terminal, so piped logs stay readable.
_clear() {
  [[ -t 1 ]] || return 0
  if command -v tput >/dev/null 2>&1; then tput clear; else printf '\033[2J\033[3J\033[H'; fi
}

# banner "Title" — opening frame: what this wizard does and how long it takes.
banner() {
  _clear
  printf '\n%s%s  %s%s\n' "$BOLD" "$BLUE" "$1" "$RESET"
  printf '%s  %s stages · about %s minutes%s\n\n' \
    "$DIM" "$TOTAL_STAGES" "$TOTAL_MINUTES" "$RESET"
  printf '%s  You drive the browser; this wizard tells you exactly what to do and\n' "$DIM"
  printf '  captures the values you copy back. Stop any time with Ctrl-C and re-run\n'
  printf '  later — it remembers values already saved.%s\n' "$RESET"
  pause "Ready to start?"
}

# stage "Name" <minutes> — clear the screen, announce a stage, and show
# progress plus estimated time remaining.
stage() {
  _clear
  _STAGE_INDEX=$((_STAGE_INDEX + 1))
  local remaining=$((TOTAL_MINUTES - _MINUTES_ELAPSED))
  (( remaining < 0 )) && remaining=0
  _MINUTES_ELAPSED=$((_MINUTES_ELAPSED + ${2:-0}))
  printf '\n%s%s▸ Stage %s/%s · %s%s  %s(~%s min left)%s\n' \
    "$BOLD" "$BLUE" "$_STAGE_INDEX" "$TOTAL_STAGES" "$1" "$RESET" "$DIM" "$remaining" "$RESET"
}

# say "..." — a plain instruction line.
say()  { printf '  %s\n' "$1"; }
# step "..." — an action the human takes in the browser.
step() { printf '  %s•%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '  %s⚠ %s%s\n' "$YELLOW" "$1" "$RESET"; }

# open_url URL — open in the human's browser, including macOS, Linux, and WSL.
open_url() {
  local url="$1"
  printf '  %s↗ opening%s %s\n' "$GREEN" "$RESET" "$url"
  { if   command -v wslview      >/dev/null 2>&1; then wslview "$url"
    elif command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$url"
    elif command -v xdg-open     >/dev/null 2>&1; then xdg-open "$url"
    elif command -v open         >/dev/null 2>&1; then open "$url"
    else warn "couldn't open a browser — visit it manually: $url"; fi
  } >/dev/null 2>&1 || warn "couldn't open a browser — visit it manually: $url"
}

# pause "msg" — wait for the human to confirm the manual part is done.
pause() {
  printf '  %s%s%s ' "$DIM" "${1:-Press Enter to continue}" "$RESET"
  read -r _ || true
}

# confirm "question" — y/N gate; return success on yes.
confirm() {
  local reply=""
  printf '  %s? %s [y/N] ' "$YELLOW" "$1"
  read -r reply || true
  [[ "$reply" =~ ^[Yy] ]]
}

# _existing KEY — current value of KEY in ENV_FILE, if any. This runs only in
# the human-controlled wizard process; the generating agent never reads it.
_existing() {
  [[ -f "$ENV_FILE" ]] || return 1
  local line; line=$(grep -E "^${1}=" "$ENV_FILE" | tail -n1) || return 1
  printf '%s' "${line#*=}"
}

# ask KEY "Prompt" — read a visible value into KEY. On re-runs, Enter keeps
# the current value from ENV_FILE.
ask() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -r input || true
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# ask_secret KEY "Prompt" — like ask, but hide terminal input.
ask_secret() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -rs input || true
  printf '\n'
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# write_env KEY VALUE — idempotently upsert KEY=VALUE into ENV_FILE.
write_env() {
  local key="$1" value="$2" tmp
  touch "$ENV_FILE"
  tmp=$(mktemp)
  grep -vE "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
  WRITTEN_ENV+=("$key")
  printf '  %s✓ wrote%s %s → %s\n' "$GREEN" "$RESET" "$key" "$ENV_FILE"
}

# set_secret NAME VALUE — set a GitHub Actions repository secret through gh.
set_secret() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if printf '%s' "$value" | gh secret set "$name" >/dev/null 2>&1; then
      WRITTEN_SECRET+=("$name")
      printf '  %s✓ set%s GitHub secret %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub secret $name (set it manually: gh secret set $name)")
  warn "skipped GitHub secret $name — gh not ready; set it later"
}

# set_var NAME VALUE — set a public GitHub Actions repository variable.
set_var() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if gh variable set "$name" --body "$value" >/dev/null 2>&1; then
      printf '  %s✓ set%s GitHub variable %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub variable $name")
  warn "skipped GitHub variable $name — gh not ready; set it later"
}

# finish — clear, then summarize configured and skipped items.
finish() {
  _clear
  printf '\n%s%s  ✓ Setup complete%s\n' "$BOLD" "$GREEN" "$RESET"
  (( ${#WRITTEN_ENV[@]} ))    && note "wrote ${#WRITTEN_ENV[@]} value(s) to $ENV_FILE: ${WRITTEN_ENV[*]}"
  (( ${#WRITTEN_SECRET[@]} )) && note "set ${#WRITTEN_SECRET[@]} GitHub secret(s): ${WRITTEN_SECRET[*]}"
  if (( ${#SKIPPED[@]} )); then
    printf '\n'; warn "still to do by hand:"
    for item in "${SKIPPED[@]}"; do note "  - $item"; done
  fi
  printf '\n'
}

# ──────────────────────────────────────────────────────────────────────────
# STAGES — author this section. Use one stage per focused human task.
# Replace the example and set both totals to match the authored stages.
# ──────────────────────────────────────────────────────────────────────────


TOTAL_STAGES=5
TOTAL_MINUTES=25
ENV_FILE=/dev/null
banner "Helios portable renderer — private VM"
note "This creates a paid Fly Machine and persistent volume. Public identifiers only; authentication stays in the provider CLI."
stage "Sign in and prepare the deployment" 5
open_url "https://fly.io/docs/flyctl/install/"
step "Install flyctl, then run fly auth login in your terminal. Run this wizard from the Helios repository root."
pause "Press Enter after signing in."
ask task_output "New deployment directory (absolute path, must not exist):"
[[ "$task_output" = /* && ! -e "$task_output" ]] || { warn "Use a new absolute directory."; exit 1; }
npm run build --workspace=@helios-project/portable
node packages/portable/scripts/prepare-deployment.mjs vm "$task_output"
(cd "$task_output" && npm install --package-lock-only --ignore-scripts --no-audit --no-fund)

stage "Create a private app" 5
open_url "https://fly.io/docs/blueprints/private-applications-flycast/"
say "The app name and region are public identifiers, written only to fly.toml in the deployment directory."
ask task_app "New Fly app name (lowercase letters, numbers, hyphens):"
ask task_region "Fly region code (for example iad):"
[[ "$task_app" =~ ^[a-z][a-z0-9-]{2,48}$ && "$task_region" =~ ^[a-z]{3}$ ]] || { warn "Invalid app name or region."; exit 1; }
confirm "Create this private app in your selected Fly organization?" || exit 0
(cd "$task_output" && fly launch --name "$task_app" --region "$task_region" --flycast --internal-port 8787 --no-deploy --no-github-workflow)
node --input-type=module - "$task_output" "$task_app" "$task_region" <<'NODE'
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const [directory, app, region] = process.argv.slice(2);
writeFileSync(join(directory, 'fly.toml'), `app = "${app}"
primary_region = "${region}"
kill_signal = "SIGTERM"
kill_timeout = "30s"
[build]
  dockerfile = "Dockerfile"
[http_service]
  internal_port = 8787
  force_https = false
  auto_stop_machines = "off"
  auto_start_machines = true
  min_machines_running = 1
[[mounts]]
  source = "render_data"
  destination = "/data"
[[vm]]
  cpu_kind = "shared"
  cpus = 2
  memory = "2gb"
`);
NODE
note "One dedicated tenant on a trusted private network. Every allowed network client has render access. Use --auth-module for a tenant-authenticated service."

stage "Create persistent storage and deploy" 7
open_url "https://fly.io/docs/volumes/overview/"
say "The first experiment uses one Machine and one local volume. Two independent local volumes do not share a render queue."
confirm "Create a paid 10 GB volume and deploy one 2 GB Machine?" || exit 0
fly volumes create render_data --app "$task_app" --region "$task_region" --size 10 --count 1
(cd "$task_output" && fly deploy --ha=false)
fly scale count 1 --app "$task_app"
step "Run the following command to make the new volume writable by the image's node user:"
say "fly ssh console --app $task_app --user root --command 'chown node:node /data'"
pause "Press Enter after setting volume ownership."

stage "Verify private access and a real render" 5
open_url "https://fly.io/docs/networking/flycast/"
fly ips list --app "$task_app"
step "Confirm there are no public IP addresses. Keep this experimental app private."
step "In another terminal, create a local tunnel with:"
say "fly proxy 8787:8787 --app $task_app"
step "Back in the Helios repository, run:"
say "node packages/portable/scripts/qualify-service.mjs http://127.0.0.1:8787"
step "Then run the corpus against this host and record billing, memory, latency, restart recovery and engine versions before claiming production qualification."
pause "Press Enter after recording the smoke result."

stage "Record ownership and cleanup" 3
say "Deployment files: $task_output"
say "Durable job state and video assets live on the render_data volume. Capacity and retention require an operator; no automatic deletion is configured."
say "Private service address: http://$task_app.flycast"
say "To remove the experiment later, review its data first, then use fly apps destroy $task_app. Deletion is irreversible."
note "Wizard steps completed. Cloud acceptance still depends on the render and recovery evidence you recorded; this script does not mark RFC gates passed."
finish
