import process from "node:process"

import { printDoctorReport, runDoctor } from "./doctor.mjs"
import { formatRun, readRunLogs, runWorkspace, statusRuns, stopRun } from "./runs.mjs"
import { printVerification, verifyUrl } from "./verify.mjs"

const VERSION = "0.2.0"

export function parseArgs(argv) {
  const separator = argv.indexOf("--")
  const args = separator === -1 ? [...argv] : argv.slice(0, separator)
  const passthrough = separator === -1 ? [] : argv.slice(separator + 1)
  const json = removeFlag(args, "--json")

  if (removeFlag(args, "--version") || removeFlag(args, "-v")) return { command: "version" }
  if (removeFlag(args, "--help") || removeFlag(args, "-h")) return { command: "help" }

  const command = args.shift() ?? "help"
  if (command === "doctor") return oneSelector(command, args, { json, field: "directory" })
  if (command === "run") {
    const directory = args.shift()
    return {
      command,
      json,
      directory,
      runCommand: passthrough[0],
      runArgs: passthrough.slice(1),
      extras: args,
    }
  }
  if (command === "status") return oneSelector(command, args, { json })
  if (command === "logs") {
    const lines = takeOption(args, "--lines")
    return { ...oneSelector(command, args, { json }), lines }
  }
  if (command === "stop") {
    const waitMs = takeOption(args, "--wait-ms")
    return { ...oneSelector(command, args, { json }), waitMs }
  }
  if (command === "verify") {
    const timeoutMs = takeOption(args, "--timeout-ms")
    const expectedStatus = takeOption(args, "--status")
    const assets = !removeFlag(args, "--no-assets")
    const url = args.shift()
    return { command, json, url, timeoutMs, expectedStatus, assets, extras: args }
  }
  return { command, json, extras: args }
}

export async function main(argv, io = console) {
  const parsed = parseArgs(argv)
  if (parsed.command === "version") return io.log(VERSION)
  if (parsed.command === "help") return io.log(helpText())
  if (parsed.extras?.length) throw new Error(`unexpected arguments: ${parsed.extras.join(" ")}`)

  if (parsed.command === "doctor") {
    const report = runDoctor(parsed.directory)
    printDoctorReport(report, { json: parsed.json, io })
    if (!report.ok) process.exitCode = 1
    return
  }

  if (parsed.command === "run") {
    if (!parsed.runCommand) throw new Error("run requires a command after --")
    const record = await runWorkspace({
      directory: parsed.directory,
      command: parsed.runCommand,
      args: parsed.runArgs,
    })
    printRecord(record, parsed.json, io, "Started")
    return
  }

  if (parsed.command === "status") {
    const records = statusRuns(parsed.selector)
    if (parsed.json) return io.log(JSON.stringify(records, null, 2))
    if (!records.length) return io.log("No managed runs.")
    for (const record of records) io.log(formatRun(record))
    return
  }

  if (parsed.command === "logs") {
    const result = readRunLogs(parsed.selector, { lines: parsed.lines })
    if (parsed.json) return io.log(JSON.stringify(result, null, 2))
    io.log(result.output)
    return
  }

  if (parsed.command === "stop") {
    const record = await stopRun(parsed.selector, { waitMs: parsed.waitMs })
    printRecord(record, parsed.json, io, "Stopped")
    return
  }

  if (parsed.command === "verify") {
    if (!parsed.url) throw new Error("verify requires an http:// or https:// URL")
    const report = await verifyUrl(parsed.url, parsed)
    printVerification(report, { json: parsed.json, io })
    if (!report.ok) process.exitCode = 1
    return
  }

  throw new Error(`unknown command: ${parsed.command}`)
}

function oneSelector(command, args, options) {
  const value = args.shift()
  const result = { command, json: options.json }
  if (args.length) result.extras = args
  result[options.field ?? "selector"] = value
  return result
}

function takeOption(args, flag) {
  const index = args.indexOf(flag)
  if (index === -1) return undefined
  if (index === args.length - 1) throw new Error(`${flag} requires a value`)
  const [value] = args.splice(index + 1, 1)
  args.splice(index, 1)
  return value
}

function removeFlag(args, flag) {
  const index = args.indexOf(flag)
  if (index === -1) return false
  args.splice(index, 1)
  return true
}

function printRecord(record, json, io, verb) {
  if (json) return io.log(JSON.stringify(record, null, 2))
  io.log(`${verb} ${record.id}: ${record.status}`)
  io.log(`PID: ${record.childPid ?? "-"}`)
  io.log(`Logs: ${record.logPath}`)
}

function helpText() {
  return [
    "WinHarness — reliable native Windows projects for remote coding agents.",
    "",
    "Usage:",
    "  winharness doctor [directory] [--json]",
    "  winharness run [directory] [--json] -- <command> [args...]",
    "  winharness status [directory|id] [--json]",
    "  winharness logs [directory|id] [--lines N] [--json]",
    "  winharness stop [directory|id] [--wait-ms N] [--json]",
    "  winharness verify <url> [--status N] [--timeout-ms N] [--no-assets] [--json]",
    "  winharness --version",
    "  winharness --help",
  ].join("\n")
}
