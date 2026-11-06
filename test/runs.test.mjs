import assert from "node:assert/strict"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import process from "node:process"
import test from "node:test"

import { readRunLogs, runWorkspace, statusRuns, stopRun } from "../src/runs.mjs"

test("starts, observes, logs, and stops an owned process", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "winharness-run-"))
  const home = path.join(root, "state")
  const script = path.join(root, "managed.mjs")
  writeFileSync(
    script,
    'console.log("managed-ready"); setInterval(() => {}, 1000)\n',
    "utf8"
  )

  let started
  try {
    started = await runWorkspace(
      { directory: root, command: process.execPath, args: [script] },
      { home, startTimeoutMs: 10_000 }
    )
    assert.equal(started.status, "running")
    assert.equal(Number.isInteger(started.childPid), true)
    assert.equal("token" in started, false)

    const [status] = statusRuns(root, { home })
    assert.equal(status.status, "running")

    const logs = await waitForLog(root, home, "managed-ready")
    assert.match(logs.output, /managed-ready/)

    const stopped = await stopRun(root, { home, waitMs: 10_000 })
    assert.equal(stopped.status, "stopped")
  } finally {
    if (started) {
      try {
        await stopRun(root, { home, waitMs: 3_000 })
      } catch {}
    }
    rmSync(root, { recursive: true, force: true })
  }
})

async function waitForLog(directory, home, pattern) {
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    const result = readRunLogs(directory, { home, lines: 20 })
    if (result.output.includes(pattern)) return result
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`log did not contain ${pattern}`)
}
