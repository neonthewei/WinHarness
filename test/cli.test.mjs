import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

import { parseArgs } from "../src/cli.mjs"
import { printDoctorReport, runDoctor } from "../src/doctor.mjs"

test("parses a JSON doctor request", () => {
  assert.deepEqual(parseArgs(["doctor", "C:/repo", "--json"]), {
    command: "doctor",
    directory: "C:/repo",
    json: true,
  })
})

test("prints stable machine-readable diagnostics", () => {
  const output = []
  printDoctorReport(
    {
      version: 1,
      ok: true,
      root: "C:/repo",
      platform: "win32",
      checks: [],
    },
    { json: true, io: { log: (value) => output.push(value) } }
  )
  assert.equal(JSON.parse(output[0]).ok, true)
})

test("diagnoses a real Git worktree without requiring cloudflared", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "winharness-"))
  try {
    execFileSync("git", ["init"], { cwd: directory, stdio: "ignore" })
    writeFileSync(
      path.join(directory, "package.json"),
      JSON.stringify({ packageManager: "npm@10" })
    )
    const report = runDoctor(directory)
    assert.equal(report.ok, true)
    assert.equal(
      report.checks.some(
        ({ check, status }) => check === "repository" && status === "pass"
      ),
      true
    )
    assert.equal(
      report.checks.some(
        ({ subject, status }) => subject === "cloudflared" && status === "fail"
      ),
      false
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
