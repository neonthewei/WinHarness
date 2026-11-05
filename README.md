# WinHarness

**Turn a native Windows PC into a powerful remote development host for Codex or Claude Code on your MacBook.**

Your MacBook is the portable endpoint. WinHarness connects it to the native
Windows PC that stays home or at the office as a powerful development back end
for remote coding agents.

Instead of overloading a memory-constrained laptop or rebuilding your personal
workspace in a blank cloud machine, put an idle desktop to work. Add affordable
RAM or storage, keep the repositories and tools already on that PC, and let
remote agents do the heavy work there.

No Linux VM, WSL, or Docker is required. The point is to make native Windows
itself a powerful remote development host.

## The target experience

From Codex or Claude Code on your MacBook, choose a Windows host and a
repository, then start working. The agent runs on the Windows PC with its
compute, files, tools, credentials, and approved desktop capabilities while your
MacBook remains light, mobile, and responsive.

```text
Codex / Claude Code on MacBook
             |
     secure remote control
             |
      WinHarness on Windows
             |
 native files, tools, apps,
 browsers, CPU, RAM, and GPU
```

WinHarness does not replace Codex or Claude Code. It prepares and operates the
native Windows host beneath those agents so each one sees a dependable workspace
instead of a collection of machine-specific setup steps. Secure transports such
as the agents' own remote-control channel, Tailscale, or SSH can carry the
connection, but the development environment remains Windows.

WinHarness is deliberately not a container manager. WSL and Docker can remain
installed for unrelated projects, but they are not prerequisites or execution
targets for the WinHarness experience.

Codex already supports remote connections to Mac, Windows, and SSH hosts.
WinHarness targets the host-readiness layer below that experience. Claude Code
supports native Windows with Git Bash; WinHarness intends to offer the same host
lifecycle through a Claude Code adapter rather than coupling the core to a
single agent.

- [Codex remote connections](https://learn.chatgpt.com/docs/remote-connections)
- [Claude Code on Windows](https://docs.anthropic.com/en/docs/claude-code/getting-started)

## Project status

WinHarness `0.1.0` is a diagnostic foundation. It is not yet a remote-control
product.

### Available now

The read-only `doctor` command inspects:

- the operating system and execution host;
- Git, Node.js, and the declared package manager;
- repository and detached-HEAD state;
- dirty working trees;
- Windows `core.autocrlf` risk;
- optional Cloudflare Tunnel availability;
- stable JSON output for agents and automation.

Clone the repository and run it:

```bash
git clone https://github.com/neonthewei/WinHarness.git
cd WinHarness
npm install
node bin/winharness.mjs doctor
node bin/winharness.mjs doctor C:\\path\\to\\repo --json
```

Warnings do not fail the command. Missing required tools and invalid workspaces
do.

### What it is intended to do

The host bridge is intended to provide agent-neutral operations for:

- registering a Windows PC as a remote development host;
- discovering approved repositories and worktrees;
- preparing the repository's native Windows runtime and shell;
- starting and resuming Codex or Claude Code work on that host;
- tracking owned processes, ports, logs, and resource use;
- verifying development servers and returning reachable preview URLs;
- keeping host-specific setup out of every repository;
- exposing the same bounded host capabilities to future coding agents.

### Not implemented yet

The current release does not:

- pair a MacBook with a Windows host;
- start or resume Codex or Claude Code sessions;
- install or manage Tailscale, SSH, or Cloudflare Tunnel;
- create or clean up worktrees;
- supervise development servers or recover failed processes;
- allocate ports or publish and verify preview URLs;
- provide a daemon, remote API, MCP server, or graphical interface;
- manage multiple Windows hosts as a fleet.

## Why Windows hosts?

High-memory laptops are expensive, and parallel coding agents can quickly push a
portable machine into swap or instability. Windows desktops are common, often
idle, and inexpensive to expand with more RAM, storage, or GPU capacity.

They also contain the real working environment: existing repositories, large
assets, local tools, browser sessions, caches, and personal organization. A
remote host should make approved parts of that environment useful without
silently granting an agent access to the entire computer.

## Safety principles

- Diagnostics are read-only by default.
- A host exposes only explicitly approved workspaces and capabilities.
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
