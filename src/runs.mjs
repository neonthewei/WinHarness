import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

import {
  ensureRunDirectory,
  isProcessAlive,
  listRunRecords,
  readJson,
  removeFile,
  runPaths,
  stateHome,
  workspaceId,
  writeJson,
} from "./state.mjs"

const SUPERVISOR = fileURLToPath(new URL("./supervisor.mjs", import.meta.url))
const ACTIVE_STATUSES = new Set(["starting", "running", "stopping"])

export async function runWorkspace(input, options = {}) {
  const directory = path.resolve(input.directory ?? process.cwd())
  if (!existsSync(directory)) throw new Error(`workspace does not exist: ${directory}`)
  if (!input.command) throw new Error("run requires a command after --")

  const paths = runPaths(directory, options)
  ensureRunDirectory(paths)
  const existing = readJson(paths.state)
  if (existing && ACTIVE_STATUSES.has(existing.status) && isProcessAlive(existing.supervisorPid)) {
    throw new Error(`workspace is already managed as ${existing.id}`)
  }
  if (existing && ACTIVE_STATUSES.has(existing.status) && isProcessAlive(existing.childPid)) {
    throw new Error(
      `workspace has a stale supervisor record but child PID ${existing.childPid} is still alive`
    )
  }

  removeFile(paths.stop)
  const token = input.token ?? cryptoToken()
  const launch = {
    version: 1,
    id: paths.id,
    token,
    directory,
    command: input.command,
    args: input.args ?? [],
    statePath: paths.state,
    logPath: paths.log,
    stopPath: paths.stop,
    launchPath: paths.launch,
    startedAt: new Date().toISOString(),
  }
  writeJson(paths.launch, launch)
  writeJson(paths.state, {
    ...publicLaunch(launch),
    status: "starting",
    supervisorPid: undefined,
    childPid: undefined,
    updatedAt: new Date().toISOString(),
  })

  const supervisor = spawn(process.execPath, [SUPERVISOR, paths.launch], {
    cwd: directory,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: process.env,
  })
  supervisor.unref()

  const record = await waitForRecord(paths.state, token, options.startTimeoutMs ?? 10_000)
  if (record.status === "failed") throw new Error(record.error || "managed command failed to start")
  return publicRecord(record)
}

export function statusRuns(selector, options = {}) {
  const records = selector ? [findRun(selector, options)].filter(Boolean) : listRunRecords(options)
  return records.map((record) => publicRecord(refreshRecord(record)))
}

export function readRunLogs(selector, options = {}) {
  const record = requireRun(selector, options)
  const lines = Math.max(1, Number(options.lines ?? 100))
  if (!record.logPath || !existsSync(record.logPath)) {
    return { record: publicRecord(refreshRecord(record)), output: "" }
  }
  const content = readFileSync(record.logPath, "utf8")
  return {
    record: publicRecord(refreshRecord(record)),
    output: content.split(/\r?\n/).slice(-lines).join("\n"),
  }
}

export async function stopRun(selector, options = {}) {
  const record = requireRun(selector, options)
  const refreshed = refreshRecord(record)
  if (!ACTIVE_STATUSES.has(refreshed.status)) return publicRecord(refreshed)
  if (!isProcessAlive(refreshed.supervisorPid)) return publicRecord({ ...refreshed, status: "stale" })

  writeFileSync(refreshed.stopPath, `${refreshed.token}\n`, "utf8")
  return publicRecord(
    await waitForStopped(refreshed.statePath, refreshed.token, options.waitMs ?? 10_000)
  )
}

export function findRun(selector, options = {}) {
  const records = listRunRecords(options)
  if (!selector) selector = process.cwd()
  const exact = records.find((record) => record.id === selector)
  if (exact) return exact
  const directory = path.resolve(selector)
  const id = workspaceId(directory)
  return records.find((record) => record.id === id || path.resolve(record.directory) === directory)
}

export function formatRun(record) {
  const command = [record.command, ...(record.args ?? [])].join(" ")
  return `${record.id}\t${record.status}\tpid=${record.childPid ?? "-"}\t${command}`
}

function requireRun(selector, options) {
  const record = findRun(selector, options)
  if (!record) throw new Error(`no managed run found for ${selector ?? process.cwd()}`)
  return record
}

function refreshRecord(record) {
  if (ACTIVE_STATUSES.has(record.status) && !isProcessAlive(record.supervisorPid)) {
    return { ...record, status: "stale" }
  }
  return record
}

async function waitForRecord(file, token, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const record = readJson(file)
    if (record?.token === token && record.status !== "starting") return record
    await delay(75)
  }
  throw new Error(`managed command did not start within ${timeoutMs}ms`)
}

async function waitForStopped(file, token, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const record = readJson(file)
    if (record?.token === token && !ACTIVE_STATUSES.has(record.status)) return record
    await delay(100)
  }
  throw new Error(`managed command did not stop within ${timeoutMs}ms`)
}

function publicLaunch(launch) {
  return {
    version: launch.version,
    id: launch.id,
    token: launch.token,
    directory: launch.directory,
    command: launch.command,
    args: launch.args,
    statePath: launch.statePath,
    logPath: launch.logPath,
    stopPath: launch.stopPath,
    startedAt: launch.startedAt,
  }
}

function publicRecord(record) {
  const { token, statePath, stopPath, ...visible } = record
  return visible
}

function cryptoToken() {
  return randomUUID()
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export { stateHome }
