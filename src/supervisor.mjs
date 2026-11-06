import { spawnSync } from "node:child_process"
import { closeSync, existsSync, openSync, readFileSync, writeSync } from "node:fs"
import process from "node:process"
import { fileURLToPath } from "node:url"

import { spawnWorkspaceCommand } from "./command.mjs"
import { readJson, removeFile, writeJson } from "./state.mjs"

export async function supervise(launchPath) {
  const launch = readJson(launchPath)
  if (!launch) throw new Error(`invalid launch file: ${launchPath}`)
  const log = openSync(launch.logPath, "a")
  const startedAt = new Date().toISOString()
  writeLine(log, `[${startedAt}] WinHarness starting: ${[launch.command, ...launch.args].join(" ")}`)

  let child
  let stopping = false
  let finished = false
  let stopTimer
  const base = {
    version: 1,
    id: launch.id,
    token: launch.token,
    directory: launch.directory,
    command: launch.command,
    args: launch.args,
    statePath: launch.statePath,
    logPath: launch.logPath,
    stopPath: launch.stopPath,
    startedAt: launch.startedAt,
    supervisorPid: process.pid,
  }

  const finish = (status, extra = {}) => {
    if (finished) return
    finished = true
    clearInterval(stopTimer)
    const finalState = {
      ...base,
      childPid: child?.pid,
      status,
      updatedAt: new Date().toISOString(),
      exitedAt: new Date().toISOString(),
      ...extra,
    }
    removeFile(launch.stopPath)
    removeFile(launch.launchPath)
    closeSync(log)
    writeJson(launch.statePath, finalState)
  }

  try {
    child = spawnWorkspaceCommand(launch.command, launch.args, {
      cwd: launch.directory,
      env: process.env,
      detached: process.platform !== "win32",
      stdio: ["ignore", log, log],
    })
  } catch (error) {
    writeLine(log, `[${new Date().toISOString()}] Failed to start: ${error.message}`)
    finish("failed", { error: error.message })
    return
  }

  child.once("spawn", () => {
    writeJson(launch.statePath, {
      ...base,
      childPid: child.pid,
      status: "running",
      updatedAt: new Date().toISOString(),
    })
  })

  child.once("error", (error) => {
    writeLine(log, `[${new Date().toISOString()}] Command error: ${error.message}`)
    finish("failed", { error: error.message })
  })

  child.once("exit", (code, signal) => {
    writeLine(log, `[${new Date().toISOString()}] Command exited: code=${code ?? "-"} signal=${signal ?? "-"}`)
    finish(stopping ? "stopped" : code === 0 ? "exited" : "failed", {
      exitCode: code,
      signal,
    })
  })

  stopTimer = setInterval(() => {
    if (!existsSync(launch.stopPath) || stopping) return
    const token = readFileSync(launch.stopPath, "utf8").trim()
    if (token !== launch.token) return
    stopping = true
    writeJson(launch.statePath, {
      ...base,
      childPid: child.pid,
      status: "stopping",
      updatedAt: new Date().toISOString(),
    })
    terminateTree(child.pid)
  }, 200)
  stopTimer.unref()

  const requestStop = () => {
    if (stopping) return
    stopping = true
    terminateTree(child.pid)
  }
  process.once("SIGTERM", requestStop)
  process.once("SIGINT", requestStop)
}

export function terminateTree(pid, platform = process.platform) {
  if (!Number.isInteger(pid) || pid <= 0) return
  if (platform === "win32") {
    spawnSync("taskkill.exe", ["/pid", String(pid), "/t", "/f"], {
      windowsHide: true,
      stdio: "ignore",
    })
    return
  }
  try {
    process.kill(-pid, "SIGTERM")
  } catch {
    try {
      process.kill(pid, "SIGTERM")
    } catch {}
  }
}

function writeLine(fd, value) {
  writeSync(fd, `${value}\n`)
}

const invokedPath = process.argv[1] ? fileURLToPath(new URL(import.meta.url)) === process.argv[1] : false
if (invokedPath) {
  supervise(process.argv[2]).catch((error) => {
    process.stderr.write(`winharness supervisor: ${error.message}\n`)
    process.exitCode = 1
  })
}
