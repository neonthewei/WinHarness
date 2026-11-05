# WinHarness

**Turn the native Windows PC you already own into a powerful remote development host for Codex or Claude Code.**

Keep your MacBook light and mobile. Put idle desktop memory and compute to work.

## Install

WinHarness currently requires Windows, Git, and Node.js 20 or newer. Install the
latest version directly from GitHub:

```powershell
npm install --global github:neonthewei/WinHarness
winharness doctor C:\path\to\repo
```

For machine-readable output:

```powershell
winharness doctor C:\path\to\repo --json
```

The current release installs only the read-only workspace doctor. It does not
yet install a background host service or enable remote control.

## Why WinHarness

AI coding changes the hardware equation. A few parallel agents, worktrees,
development servers, browsers, and local tools can exhaust a MacBook's memory
quickly. Buying substantially more laptop memory is expensive, while a Windows
desktop at home or in the office may already be sitting idle and can often be
expanded with affordable RAM and storage.

That Windows PC also contains something a blank cloud machine does not: your
real working environment. Its repositories, files, tools, caches, browser
sessions, desktop applications, organization, and habits are already there.

WinHarness is for people who want to use AI coding agents, not become remote
infrastructure administrators. It makes that existing native Windows machine a
dependable back end for the MacBook they carry.

## The experience

Open Codex or Claude Code on your MacBook, choose your Windows PC and project,
and start working. The coding agent runs against the Windows host's approved
workspace and uses its CPU, RAM, storage, GPU, tools, and desktop capabilities.
Your MacBook remains the responsive, portable control surface.

```text
MacBook
Codex / Claude Code
        |
 secure remote control
        |
WinHarness on native Windows
        |
approved files, tools, apps,
browsers, CPU, RAM, storage, GPU
```

No Linux VM, WSL, Docker, or blank cloud workspace is required. Windows is not
an intermediate stop on the way to Linux; it is the development host.

## What WinHarness adds

Codex and Claude Code remain responsible for conversations, reasoning, code
changes, and approvals. Their own remote-control channel, Tailscale, or SSH can
provide secure transport. WinHarness owns the native Windows host beneath them:

- keeping the machine and its approved workspaces ready for remote agents;
- discovering repositories and creating isolated worktrees;
- selecting the correct native runtime, shell, and package manager;
- tracking owned processes, ports, logs, and resource use;
- verifying development servers instead of only checking that a process exists;
- returning reachable preview URLs when a project needs to be shared;
- preserving one consistent host contract across Codex, Claude Code, and future
  coding agents;
- keeping machine-specific setup out of every application repository.

Codex already supports remote connections to Windows and SSH hosts. WinHarness
is intended to make the Windows side of that experience dependable. Claude Code
supports native Windows with Git Bash; a Claude Code adapter can use the same
host contract without coupling WinHarness to one agent.

- [Codex remote connections](https://learn.chatgpt.com/docs/remote-connections)
- [Claude Code on Windows](https://docs.anthropic.com/en/docs/claude-code/getting-started)

## What WinHarness is not

- It is not a remote desktop. The agent works on the host while you steer it
  from your MacBook.
- It is not a container manager. Native Windows is the supported host path.
- It is not another coding agent. Codex, Claude Code, and future agents sit on
  top of it.
- It is not a cloud hosting provider. It makes use of hardware and working
  context you already own.
- It is not a public shell. Every remote capability must be authenticated,
  bounded, and explicitly approved.

## Current release

WinHarness `0.1.0` is the diagnostic foundation. It does not yet provide the
complete remote-host experience described above.

### Available today

The read-only `doctor` command reports:

- the operating system and execution host;
- Git, Node.js, and the declared package manager;
- repository and detached-HEAD state;
- dirty working trees;
- Windows `core.autocrlf` risk;
- optional Cloudflare Tunnel availability;
- stable JSON output for agents and automation.

Warnings do not fail the command. Missing required tools and invalid workspaces
do.

### What the complete experience still needs

`doctor` answers whether a workspace looks usable. The complete remote-host
experience requires these additional pieces:

1. **Host service** — a small native Windows service that starts with the PC,
   stays available while the screen is locked, and reports machine health.
2. **Secure pairing and policy** — authenticated MacBook-to-host pairing,
   explicit workspace roots, capability grants, and revocation.
3. **Workspace controller** — repository discovery, worktree creation,
   dependency preparation, and clean ownership records for every task.
4. **Native Windows command runtime** — reliable PowerShell, `cmd.exe`, and Git
   Bash execution with correct paths, package-manager shims, signals, and exit
   status handling.
5. **Agent adapters** — Codex host preparation that complements Codex Remote,
   plus a Claude Code adapter that can install, authenticate, start, and resume
   sessions without changing the host contract.
6. **Process supervisor** — owned PID tracking, port allocation, logs, memory
   reporting, health checks, failure explanation, and safe cleanup.
7. **Preview delivery** — application-level verification followed by an
   optional reachable HTTPS URL when a workspace needs to be shared.
8. **Control surface** — stable `install`, `pair`, `add`, `start`, `status`,
   `logs`, and `stop` commands, followed by a simple MacBook interface.

Several-host discovery and scheduling can build on this foundation later; they
are not required for the first useful MacBook-to-Windows experience.

A Codex-first release can reuse Codex Remote instead of rebuilding remote
pairing. Its shortest path is the workspace controller, native command runtime,
process supervisor, preview delivery, and control surface. The host service,
pairing layer, and Claude Code adapter are what extend that dependable Windows
experience beyond Codex to Claude Code and future agents.

## Safety principles

- Diagnostics are read-only by default.
- A host exposes only explicitly approved workspaces and capabilities.
- Personal files are not available merely because they exist on the machine.
- Remote infrastructure is never provisioned merely because a worktree exists.
- Repair, deletion, and remote mutation require explicit commands.
- Secrets are referenced by name and never printed in reports.
- Public preview URLs are not authentication and are labeled accordingly.
- Process cleanup verifies ownership before terminating anything.
- Control is limited to machines owned or explicitly administered by the user.

## Development

```bash
npm install
npm run check
node bin/winharness.mjs doctor
```

See [CONTRIBUTING.md](CONTRIBUTING.md) before proposing host lifecycle, remote
control, or repair behavior.

## License

Apache-2.0. WinHarness is an independent open-source project and is not
affiliated with or endorsed by Anthropic, Apple, Cloudflare, Microsoft, OpenAI,
or Tailscale.
