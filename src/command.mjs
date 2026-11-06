import { spawn } from "node:child_process"
import { existsSync, statSync } from "node:fs"
import path from "node:path"
import process from "node:process"

export function resolveWindowsCommand(command, options = {}) {
  const cwd = options.cwd ?? process.cwd()
  const env = options.env ?? process.env
  const extensions = windowsExtensions(env)
  const hasDirectory = /[\\/]/.test(command)
  const directories = hasDirectory
    ? [""]
    : String(env.PATH ?? "")
        .split(path.delimiter)
        .filter(Boolean)
  const base = hasDirectory && !path.isAbsolute(command) ? path.resolve(cwd, command) : command
  const explicitExtension = Boolean(path.extname(base))
  const suffixes = explicitExtension ? [""] : [...extensions, ""]

  for (const suffix of suffixes) {
    for (const directory of directories) {
      const candidate = `${base}${suffix}`
      const fullPath = directory ? path.join(directory, candidate) : candidate
      if (isFile(fullPath)) return path.resolve(fullPath)
    }
  }
  return undefined
}

export function spawnWorkspaceCommand(command, args, options = {}) {
  const platform = options.platform ?? process.platform
  const spawnOptions = {
    cwd: options.cwd,
    env: options.env,
    detached: options.detached ?? false,
    stdio: options.stdio ?? "inherit",
    windowsHide: true,
  }

  if (platform !== "win32") return spawn(command, args, spawnOptions)

  const resolved = resolveWindowsCommand(command, options)
  if (!resolved) {
    const error = new Error(`command not found on PATH: ${command}`)
    error.code = "ENOENT"
    throw error
  }
  const extension = path.extname(resolved).toLowerCase()
  if (extension !== ".cmd" && extension !== ".bat") {
    return spawn(resolved, args, spawnOptions)
  }
  const commandShell = options.env?.ComSpec || process.env.ComSpec || "cmd.exe"
  const commandLine = ["call", quoteCmdToken(resolved), ...args.map(quoteCmdToken)].join(" ")
  return spawn(commandShell, ["/d", "/s", "/c", commandLine], {
    ...spawnOptions,
    windowsVerbatimArguments: true,
  })
}

export function quoteCmdToken(value) {
  const token = String(value)
  if (!token) return '""'
  if (/["\r\n\0]/.test(token)) {
    throw new Error("Windows command-shim arguments cannot contain quotes or line breaks")
  }
  if (!/[\s&|<>^()%!]/.test(token)) return token
  return `"${token}"`
}

function windowsExtensions(env) {
  const configured = String(env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .filter(Boolean)
    .map((extension) => extension.toLowerCase())
  const native = configured.filter((extension) => extension === ".exe" || extension === ".com")
  const scripts = configured.filter((extension) => extension !== ".exe" && extension !== ".com")
  return [...native, ...scripts]
}

function isFile(file) {
  try {
    return existsSync(file) && statSync(file).isFile()
  } catch {
    return false
  }
}
