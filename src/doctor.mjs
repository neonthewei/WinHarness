import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import process from "node:process"

export function runDoctor(directory = process.cwd(), options = {}) {
  const root = path.resolve(directory)
  const platform = options.platform ?? process.platform
  const checks = []

  checks.push({
    check: "platform",
    subject: platform,
    status: platform === "win32" ? "pass" : "info",
    detail:
      platform === "win32"
        ? "Windows execution host detected."
        : "Non-Windows host detected; WinHarness can still inspect this workspace.",
  })

  const git = probeCommand("git", ["--version"], { cwd: root, platform })
  checks.push(toolCheck("git", git, true))

  const node = probeCommand(process.execPath, ["--version"], {
    cwd: root,
    platform,
  })
  checks.push(toolCheck("node", node, true))

  if (git.ok) inspectRepository(root, platform, checks)
  inspectPackageManager(root, platform, checks)

  const cloudflared = probeCommand("cloudflared", ["--version"], {
    cwd: root,
    platform,
  })
  checks.push(
    toolCheck("cloudflared", cloudflared, false, {
      advice:
        "Install cloudflared when you want WinHarness to publish verified HTTPS previews.",
    })
  )

  return {
    version: 1,
    ok: !checks.some(({ status }) => status === "fail"),
    root,
    platform,
    checks,
  }
}

export function printDoctorReport(report, { json = false, io = console } = {}) {
  if (json) {
    io.log(JSON.stringify(report, null, 2))
    return
  }

  io.log(`WinHarness doctor: ${report.root}`)
  io.log("")
  for (const check of report.checks) {
    io.log(`${symbol(check.status)} ${check.check}: ${check.detail}`)
    if (check.advice) io.log(`  ${check.advice}`)
  }
  io.log("")
  const failures = report.checks.filter(({ status }) => status === "fail")
  io.log(
    failures.length === 0
      ? "Workspace diagnostics completed without blocking failures."
      : `${failures.length} blocking check(s) failed.`
  )
}

export function probeCommand(
  command,
  args,
  { cwd = process.cwd(), platform = process.platform } = {}
) {
  const options = {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    timeout: 10_000,
  }
  let result = spawnSync(command, args, options)
  if (platform === "win32" && result.error?.code === "ENOENT") {
    result = spawnSync(
      "cmd.exe",
      ["/d", "/s", "/c", `${command}.cmd`, ...args],
      options
    )
  }
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
    .trim()
    .split(/\r?\n/)[0]
    ?.slice(0, 240)
  return {
    ok: result.status === 0,
    output: output || "no version output",
    error: result.error?.message,
  }
}

function inspectRepository(root, platform, checks) {
  const repository = gitProbe(root, ["rev-parse", "--show-toplevel"])
  if (!repository.ok) {
    checks.push({
      check: "repository",
      subject: root,
      status: "fail",
      detail: "The target directory is not inside a Git working tree.",
      advice: "Run WinHarness from a Git checkout or pass its path to doctor.",
    })
    return
  }

  checks.push({
    check: "repository",
    subject: repository.output,
    status: "pass",
    detail: `Git working tree found at ${repository.output}.`,
  })

  const branch = gitProbe(root, ["symbolic-ref", "--short", "-q", "HEAD"])
  checks.push({
    check: "head",
    subject: branch.ok ? branch.output : "detached",
    status: branch.ok ? "pass" : "info",
    detail: branch.ok
      ? `Branch ${branch.output} is checked out.`
      : "Detached HEAD detected; this is valid for agent-created worktrees.",
  })

  const status = gitProbe(root, ["status", "--porcelain=v1"])
  const dirty = status.ok && Boolean(status.output)
  checks.push({
    check: "working-tree",
    subject: root,
    status: dirty ? "warn" : "pass",
    detail: dirty
      ? "The working tree has local changes."
      : "The working tree is clean.",
    advice: dirty
      ? "Review local changes before applying any future repair command."
      : undefined,
  })

  const autocrlf = gitProbe(root, ["config", "--get", "core.autocrlf"])
  if (platform === "win32" && autocrlf.ok && autocrlf.output === "true") {
    checks.push({
      check: "line-endings",
      subject: "core.autocrlf",
      status: "warn",
      detail: "Git core.autocrlf is enabled on this Windows host.",
      advice:
        "Use checked-in .gitattributes rules for byte-sensitive files and inspect them before changing Git configuration.",
    })
  } else {
    checks.push({
      check: "line-endings",
      subject: "core.autocrlf",
      status: "pass",
      detail: autocrlf.ok
        ? `Git core.autocrlf is ${autocrlf.output}.`
        : "Git core.autocrlf is not explicitly configured for this repository.",
    })
  }
}

function inspectPackageManager(root, platform, checks) {
  const packagePath = path.join(root, "package.json")
  if (!existsSync(packagePath)) {
    checks.push({
      check: "package-manager",
      subject: packagePath,
      status: "info",
      detail: "No package.json was found at the target directory.",
    })
    return
  }

  try {
    const manifest = JSON.parse(readFileSync(packagePath, "utf8"))
    const declared = String(manifest.packageManager ?? "").split("@")[0]
    if (!declared) {
      checks.push({
        check: "package-manager",
        subject: packagePath,
        status: "warn",
        detail: "package.json does not declare packageManager.",
        advice:
          "Declare packageManager so every worktree uses the same tool and version family.",
      })
      return
    }
    const probe = probeCommand(declared, ["--version"], { cwd: root, platform })
    checks.push(toolCheck(declared, probe, true))
  } catch (error) {
    checks.push({
      check: "package-manager",
      subject: packagePath,
      status: "fail",
      detail: `package.json could not be read: ${error.message}`,
    })
  }
}

function gitProbe(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    timeout: 10_000,
  })
  return {
    ok: result.status === 0,
    output: String(result.stdout ?? "").trim(),
  }
}

function toolCheck(name, probe, required, overrides = {}) {
  return {
    check: "tool",
    subject: name,
    status: probe.ok ? "pass" : required ? "fail" : "warn",
    detail: probe.ok
      ? `${name} is available (${probe.output}).`
      : `${name} is not available.`,
    advice:
      overrides.advice ??
      (required ? `Install ${name} and make it available on PATH.` : undefined),
  }
}

function symbol(status) {
  if (status === "pass") return "PASS"
  if (status === "fail") return "FAIL"
  if (status === "warn") return "WARN"
  return "INFO"
}
