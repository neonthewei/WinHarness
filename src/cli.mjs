import process from "node:process"

import { printDoctorReport, runDoctor } from "./doctor.mjs"

const VERSION = "0.1.0"

export function parseArgs(argv) {
  const args = [...argv]
  const json = removeFlag(args, "--json")

  if (removeFlag(args, "--version") || removeFlag(args, "-v")) {
    return { command: "version" }
  }
  if (removeFlag(args, "--help") || removeFlag(args, "-h")) {
    return { command: "help" }
  }

  const command = args.shift() ?? "help"
  if (command !== "doctor") return { command, json, extras: args }
  if (args.length > 1) return { command, json, extras: args.slice(1) }
  return { command, json, directory: args[0] }
}

export async function main(argv, io = console) {
  const parsed = parseArgs(argv)
  if (parsed.command === "version") {
    io.log(VERSION)
    return
  }
  if (parsed.command === "help") {
    io.log(helpText())
    return
  }
  if (parsed.command !== "doctor") {
    throw new Error(`unknown command: ${parsed.command}`)
  }
  if (parsed.extras?.length) {
    throw new Error(`unexpected arguments: ${parsed.extras.join(" ")}`)
  }

  const report = runDoctor(parsed.directory)
  printDoctorReport(report, { json: parsed.json, io })
  if (!report.ok) process.exitCode = 1
}

function removeFlag(args, flag) {
  const index = args.indexOf(flag)
  if (index === -1) return false
  args.splice(index, 1)
  return true
}

function helpText() {
  return [
    "WinHarness — turn a native Windows PC into a powerful remote development host for Codex or Claude Code on your MacBook.",
    "",
    "Usage:",
    "  winharness doctor [directory] [--json]",
    "  winharness --version",
    "  winharness --help",
    "",
    "The current release provides read-only workspace diagnostics.",
  ].join("\n")
}
