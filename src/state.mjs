import { createHash, randomUUID } from "node:crypto"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import process from "node:process"

export function stateHome(env = process.env, platform = process.platform) {
  if (env.WINHARNESS_HOME) return path.resolve(env.WINHARNESS_HOME)
  if (platform === "win32") {
    return path.join(env.LOCALAPPDATA || homedir(), "WinHarness")
  }
  return path.join(env.XDG_STATE_HOME || path.join(homedir(), ".local", "state"), "winharness")
}

export function workspaceId(directory) {
  const root = path.resolve(directory)
  const slug = path.basename(root).replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "workspace"
  const digest = createHash("sha256").update(root.toLowerCase()).digest("hex").slice(0, 10)
  return `${slug}-${digest}`
}

export function runPaths(directory, options = {}) {
  const root = options.home ?? stateHome(options.env, options.platform)
  const runs = path.join(root, "runs")
  const id = workspaceId(directory)
  return {
    root,
    runs,
    id,
    state: path.join(runs, `${id}.json`),
    log: path.join(runs, `${id}.log`),
    stop: path.join(runs, `${id}.stop`),
    launch: path.join(runs, `${id}.${randomUUID()}.launch.json`),
  }
}

export function ensureRunDirectory(paths) {
  mkdirSync(paths.runs, { recursive: true })
}

export function readJson(file) {
  if (!existsSync(file)) return undefined
  try {
    return JSON.parse(readFileSync(file, "utf8"))
  } catch {
    return undefined
  }
}

export function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8")
  renameSync(temporary, file)
}

export function removeFile(file) {
  rmSync(file, { force: true })
}

export function listRunRecords(options = {}) {
  const root = options.home ?? stateHome(options.env, options.platform)
  const runs = path.join(root, "runs")
  if (!existsSync(runs)) return []
  return readdirSync(runs)
    .filter((name) => name.endsWith(".json") && !name.includes(".launch.json"))
    .map((name) => readJson(path.join(runs, name)))
    .filter(Boolean)
    .sort((left, right) => String(right.startedAt).localeCompare(String(left.startedAt)))
}

export function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error?.code === "EPERM"
  }
}
