# WinHarness

**Harness your Windows PCs. Build from anywhere.**

WinHarness turns Windows desktops into expandable, agent-ready development
machines. Your Mac is the cockpit; your Windows PCs do the heavy lifting.

WinHarness is the Windows-first execution layer between a portable Mac cockpit
and the development rigs that stay at home or in the office. It starts with the
diagnostic foundation required to make agent-created worktrees dependable.

## Use WinHarness

Clone the repository and run the read-only workspace doctor:

```bash
git clone https://github.com/neonthewei/WinHarness.git
cd WinHarness
npm install
node bin/winharness.mjs doctor
node bin/winharness.mjs doctor C:\\path\\to\\repo --json
```

The doctor inspects:

- operating system and execution host;
- Git, Node.js, and the declared package manager;
- repository and detached-HEAD state;
- dirty working trees;
- Windows `core.autocrlf` risk;
- optional Cloudflare Tunnel availability.

Warnings do not fail the command. Missing required tools and invalid workspaces
do. `--json` returns the same report for agents and automation.

## How it fits

```text
Mac / Codex                 Windows rigs
portable cockpit            persistent execution
       |                           |
       +------ WinHarness ---------+
                     |
              verified public links
```

WinHarness is not a remote desktop, another Git worktree manager, or a cloud
hosting provider. Existing tools can create worktrees; WinHarness makes the
resulting development environment dependable after creation.

Codex, Copilot, Cursor, Claude, or Git can create the worktree. WinHarness owns
the Windows-specific readiness boundary and reports the same facts to a human or
an agent through its JSON output.

## Safety principles

- Diagnostics are read-only by default.
- Remote infrastructure is never provisioned merely because a worktree exists.
- Repair, deletion, and remote mutation require explicit commands.
- Secrets are referenced by name and never printed in reports.
- Public preview URLs are not authentication and are labeled accordingly.
- Process cleanup verifies ownership before terminating anything.
- Control is designed for machines owned or explicitly administered by the user.

## Why Windows first?

Powerful Windows desktops are often left behind when developers work from a
portable Mac. They also expose path, shell, executable-shim, line-ending, and
process-lifecycle differences that many agent tools treat as an afterthought.

WinHarness makes those machines useful as persistent development rigs instead:
keep the compute at home or in the office, carry the cockpit, and scale by adding
another PC.

## Development

```bash
npm install
npm run check
node bin/winharness.mjs doctor
```

See [CONTRIBUTING.md](CONTRIBUTING.md) before proposing lifecycle or repair
behavior.

## License

Apache-2.0. WinHarness is an independent open-source project and is not
affiliated with or endorsed by Microsoft, Apple, Cloudflare, or OpenAI.
