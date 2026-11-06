# WinHarness

**Make native Windows development dependable after Codex or Claude Code connects over Remote, Tailscale, or SSH.**

Keep your MacBook light and mobile. Put idle Windows desktop memory and compute
to work without moving the project into WSL, Docker, or a blank cloud machine.

## Install

WinHarness requires Windows, Git, and Node.js 20 or newer:

```powershell
npm install --global github:neonthewei/WinHarness
winharness --version
```

## Use

Inspect a repository before starting it:

```powershell
winharness doctor C:\Projects\my-app
```

Start its development command under an owned background supervisor:

```powershell
winharness run C:\Projects\my-app -- pnpm dev
```

Inspect the process and its output from another Codex, Claude Code, or SSH
session:

```powershell
winharness status C:\Projects\my-app
winharness logs C:\Projects\my-app --lines 200
```

Verify that the page and its same-origin script and stylesheet assets respond:

```powershell
winharness verify http://127.0.0.1:3000
```

Stop only the process tree owned by that managed run:

```powershell
winharness stop C:\Projects\my-app
```

Every command supports `--json` for agents and automation. Run
`winharness --help` for the complete syntax.

## Why WinHarness

Tailscale and SSH solve connectivity. Codex Remote can already connect to a
Windows host. They do not make a project's native Windows command, process,
path, worktree, or frontend behavior reliable after the connection succeeds.

WinHarness owns that boundary:

- native `.exe` commands are preferred before `.cmd` and `.bat` shims;
- managed commands keep running after the launching shell exits;
- each workspace receives a stable identity, state record, log, and owner PID;
- repeated starts are rejected while the previous managed process is alive;
- stop requests carry a per-run token and are handled by the owning supervisor;
- stale supervisors are reported instead of guessing that an old PID is safe to
  kill;
- HTTP verification checks the requested page and referenced same-origin
  scripts and styles, not merely whether a process exists.

The result is one native Windows interface that Codex, Claude Code, another
agent, or a human can call after connecting to the PC.

```text
MacBook
Codex / Claude Code
        |
Remote / Tailscale / SSH
        |
WinHarness on native Windows
        |
run · status · logs · verify · stop
```

## Commands

### `doctor`

Reports Windows, Git, Node.js, repository, detached-HEAD, dirty-worktree,
`core.autocrlf`, declared package-manager, and optional Cloudflare Tunnel state.

### `run`

Starts the command after `--` from the selected workspace. WinHarness stores
state and logs under the current user's application-data directory, then leaves
a small supervisor responsible for that process tree.

### `status`

Shows one workspace or all managed runs. A missing supervisor is reported as
stale rather than silently treated as stopped.

### `logs`

Prints the tail of a managed run's combined standard output and error log.

### `verify`

Fetches an HTTP or HTTPS URL, follows redirects, checks the expected status, and
verifies referenced same-origin assets. Use `--no-assets` for endpoint-only
checks.

### `stop`

Asks the recorded supervisor to stop its owned process tree and waits for the
final state. It does not terminate an unrelated PID from a stale record.

## Current scope

WinHarness `0.2.0` provides the native command runner, persistent run records,
process supervision, logs, safe stop requests, and HTTP verification.

It does not yet:

- install or configure Codex Remote, Tailscale, or Windows OpenSSH;
- create worktrees or install repository dependencies;
- discover or allocate application ports automatically;
- report live CPU, RAM, or GPU use;
- restart failed commands;
- create public preview tunnels;
- provide a Claude Code-specific adapter or graphical interface;
- coordinate several Windows PCs.

Those features can build on the same local command and ownership contract
without replacing the remote connection tools that already work.

## Safety

- A managed command is explicit and runs only in the selected workspace.
- Run-control tokens remain in the per-user state directory and are omitted from
  CLI JSON output.
- Stop requests are handled by the supervisor that created the child process.
- WinHarness does not expose a public shell or network listener.
- Personal files are not made available merely because they exist on the PC.
- Public preview URLs, if added later, will not be treated as authentication.

## Development

```bash
npm install
npm run check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) before changing command execution,
process ownership, or remote-control behavior.

## License

Apache-2.0. WinHarness is an independent open-source project and is not
affiliated with or endorsed by Anthropic, Apple, Microsoft, OpenAI, or
Tailscale.
