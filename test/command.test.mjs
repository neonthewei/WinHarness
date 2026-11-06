import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import process from "node:process"
import test from "node:test"

import {
  quoteCmdToken,
  resolveWindowsCommand,
  spawnWorkspaceCommand,
} from "../src/command.mjs"

test("prefers a native Windows executable over a command shim", () => {
  const root = mkdtempSync(path.join(tmpdir(), "winharness-command-"))
  try {
    const first = path.join(root, "first")
    const second = path.join(root, "second")
    mkdirSync(first)
    mkdirSync(second)
    writeFileSync(path.join(first, "tool.cmd"), "@echo shim\r\n")
    writeFileSync(path.join(second, "tool.exe"), "second")

    const resolved = resolveWindowsCommand("tool", {
      env: { PATH: `${first}${path.delimiter}${second}`, PATHEXT: ".CMD;.EXE" },
    })
    assert.equal(resolved, path.resolve(second, "tool.exe"))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("quotes Windows command tokens for cmd.exe", () => {
  assert.equal(quoteCmdToken("plain"), "plain")
  assert.equal(quoteCmdToken("C:\\Program Files\\tool.cmd"), '"C:\\Program Files\\tool.cmd"')
  assert.equal(quoteCmdToken("hello & goodbye"), '"hello & goodbye"')
  assert.throws(() => quoteCmdToken('hello"goodbye'), /cannot contain quotes/)
})

test(
  "executes an installed Windows command shim and preserves output",
  { skip: process.platform !== "win32" },
  async () => {
    const child = spawnWorkspaceCommand("npm", ["--version"], {
      stdio: ["ignore", "pipe", "pipe"],
    })
    let output = ""
    child.stdout.on("data", (chunk) => (output += chunk))
    child.stderr.on("data", (chunk) => (output += chunk))
    const code = await new Promise((resolve, reject) => {
      child.once("error", reject)
      child.once("exit", resolve)
    })
    assert.equal(code, 0)
    assert.match(output, /\d+\.\d+\.\d+/)
  }
)
