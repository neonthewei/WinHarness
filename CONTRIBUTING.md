# Contributing

WinHarness is Windows-first and cross-platform by design. Changes to command
execution, paths, processes, or lifecycle behavior should include Windows proof
and must not weaken Linux or macOS behavior.

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
