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


TOTAL_STAGES=6
TOTAL_MINUTES=40
ENV_FILE=/dev/null
banner "Helios portable renderer — Vercel Functions + S3"
note "This prepares a paid function/storage experiment. Only public identifiers are saved. No secret is requested or written."
stage "Choose the project and storage" 7
open_url "https://vercel.com/new"
step "Choose the Vercel team and create or select the renderer project. Use the Node.js runtime."
ask task_team "Vercel team slug:"
ask task_project "Renderer project name:"
ask task_caller "Calling SaaS project's name in the same team:"
open_url "https://console.aws.amazon.com/s3/"
step "Create a dedicated general-purpose S3 bucket in the intended region. Keep Block Public Access enabled and default encryption enabled."
ask task_bucket "S3 bucket name:"
ask task_region "Bucket AWS region (for example us-east-1):"
ask task_account "AWS account ID (12 public digits):"
[[ "$task_team" =~ ^[a-zA-Z0-9_-]+$ && "$task_project" =~ ^[a-zA-Z0-9_-]+$ && "$task_caller" =~ ^[a-zA-Z0-9_-]+$ && "$task_bucket" =~ ^[a-z0-9][a-z0-9.-]+$ && "$task_region" =~ ^[a-z]{2}-[a-z]+-[0-9]+$ && "$task_account" =~ ^[0-9]{12}$ ]] || { warn "A public identifier has an invalid format."; exit 1; }

stage "Prepare the deployable project and IAM policies" 5
say "Team/project names, account ID, region, bucket and role ARN are public. They go into this deployment directory only."
ask task_output "New deployment directory (absolute path, must not exist):"
[[ "$task_output" = /* && ! -e "$task_output" ]] || { warn "Use a new absolute directory."; exit 1; }
npm run build --workspace=@helios-project/portable
node packages/portable/scripts/prepare-deployment.mjs vercel "$task_output"
node --input-type=module - "$task_output" "$task_team" "$task_project" "$task_bucket" "$task_account" <<'NODE'
import { writeFileSync } from 'node:fs'; import { join } from 'node:path';
const [directory, team, project, bucket, account] = process.argv.slice(2);
const issuer = `oidc.vercel.com/${team}`;
const trust = { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Principal: { Federated: `arn:aws:iam::${account}:oidc-provider/${issuer}` }, Action: 'sts:AssumeRoleWithWebIdentity', Condition: { StringEquals: { [`${issuer}:aud`]: `https://vercel.com/${team}`, [`${issuer}:sub`]: `owner:${team}:project:${project}:environment:production` } } }] };
const access = { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['s3:ListBucket'], Resource: `arn:aws:s3:::${bucket}`, Condition: { StringLike: { 's3:prefix': ['helios/*'] } } }, { Effect: 'Allow', Action: ['s3:GetObject', 's3:PutObject'], Resource: `arn:aws:s3:::${bucket}/helios/*` }] };
writeFileSync(join(directory, 'trust-policy.json'), JSON.stringify(trust, null, 2));
writeFileSync(join(directory, 'storage-policy.json'), JSON.stringify(access, null, 2));
NODE

stage "Trust the renderer's workload identity" 10
open_url "https://vercel.com/docs/oidc/aws"
step "In AWS IAM → Identity providers → Add provider, choose OpenID Connect."
say "Provider URL: https://oidc.vercel.com/$task_team"
say "Audience: https://vercel.com/$task_team"
open_url "https://console.aws.amazon.com/iam/"
step "Create an IAM role with the generated trust-policy.json. Attach an inline policy using storage-policy.json. The trust is restricted to the renderer's production project."
ask task_role "Created role ARN (public):"
[[ "$task_role" =~ ^arn:aws:iam::[0-9]{12}:role/[a-zA-Z0-9_+=,.@/-]+$ ]] || { warn "Invalid role ARN."; exit 1; }

stage "Configure incoming authentication" 5
open_url "https://vercel.com/docs/oidc/api"
step "Enable/configure OIDC with the team issuer for the renderer and calling SaaS projects. The caller must send its platform-issued bearer token."
note "The renderer verifies issuer, audience, expiry, signature and the exact calling-project subject. A request header alone never selects a tenant."
node --input-type=module - "$task_output" "$task_team" "$task_caller" "$task_bucket" "$task_region" "$task_role" <<'NODE'
import { writeFileSync } from 'node:fs'; import { join } from 'node:path';
const [directory, team, caller, bucket, region, roleArn] = process.argv.slice(2);
const config = { bucket, region, roleArn, oidc: { issuer: `https://oidc.vercel.com/${team}`, audience: `https://vercel.com/${team}`, jwksUrl: `https://oidc.vercel.com/${team}/.well-known/jwks`, subjects: { [`owner:${team}:project:${caller}:environment:production`]: caller } } };
writeFileSync(join(directory, 'portable-config.json'), JSON.stringify(config, null, 2));
NODE
pause "Press Enter after confirming both projects use the expected issuer."

stage "Deploy and test within function limits" 10
open_url "https://vercel.com/docs/functions/limitations"
say "Candidate configuration: Node 22, 2 GB memory, 300-second invocation budget, 30-frame chunks, 60-second compositions, 450 MiB estimated scratch budget. This is not a 512 MB qualification."
step "In another terminal, install the Vercel CLI and run vercel login. Then cd to the generated deployment directory."
step "Run npm install, then vercel link to the selected renderer project. Dependencies include native Linux graphics and FFmpeg/ffprobe."
step "Use Vercel remote Linux builds. A local macOS vercel build cannot qualify the Linux native binaries. After deployment, inspect the function bundle and verify both codecs are present."
pause "Press Enter after linking the correct renderer project."
confirm "Deploy this function to production for the controlled rendering experiment?" || exit 0
(cd "$task_output" && vercel deploy --prod)
step "Use packages/portable/examples/vercel-caller.mjs in the calling SaaS project's server-side runtime to test a real render. Do not paste an OIDC token into chat or a command."
step "Test duplicate submit, cancel, forced timeout/retry and downloaded MP4 integrity. Every workflow retry must preserve the original idempotency key."
pause "Press Enter after recording the remote result or its exact failure category."

stage "Cost, lifecycle and remaining qualification" 3
say "Public config and policies: $task_output"
say "S3 contains durable state/assets/chunks/artifacts. Configure monitoring and an explicit retention policy; deleting live manifests or chunks breaks recovery."
say "No static AWS key or API secret was created. Vercel and AWS exchange short-lived workload credentials at runtime."
say "To remove the experiment, disable the renderer deployment, then review and delete its dedicated S3 bucket and IAM role/provider only when no other project uses them."
note "Static wizard checks do not establish function compatibility, S3 semantics, operating cost or any RFC qualification gate. Keep the deployment experimental until its evidence passes."
finish
