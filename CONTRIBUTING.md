# Contributing

WinHarness is a Windows host bridge for remote coding agents. The core remains
agent-neutral; Codex, Claude Code, and future integrations belong in bounded
adapters. The supported host path runs directly on native Windows and must not
depend on WSL or Docker. Changes to command execution, paths, processes, or
lifecycle behavior should include native Windows proof and must not weaken
MacBook clients and macOS tooling.

## Development

Requirements:

- Node.js 20 or newer
- Git

Run the checks:

```bash
npm install
npm run check
```

Keep diagnostics read-only by default. A repair or remote mutation must be
explicit, bounded to the selected workspace, and recoverable where practical.
Never print secrets or copy ignored credential files without a specific user
request and a documented transport.

Remote control must use authenticated transports and capability-scoped
operations. Do not expose a general-purpose shell, app-server transport, or
credential-bearing endpoint directly to a public network.
