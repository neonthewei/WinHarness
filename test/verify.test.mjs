import assert from "node:assert/strict"
import { createServer } from "node:http"
import test from "node:test"

import { verifyUrl } from "../src/verify.mjs"

test("verifies an HTML root and its same-origin assets", async () => {
  const server = createServer((request, response) => {
    if (request.url === "/app.js") {
      response.writeHead(200, { "content-type": "application/javascript" })
      response.end("window.ready = true")
      return
    }
    response.writeHead(200, { "content-type": "text/html" })
    response.end('<!doctype html><script src="/app.js"></script>')
  })
  await listen(server)
  try {
    const address = server.address()
    const report = await verifyUrl(`http://127.0.0.1:${address.port}`)
    assert.equal(report.ok, true)
    assert.equal(report.root.status, 200)
    assert.equal(report.assets.length, 1)
    assert.equal(report.assets[0].status, 200)
  } finally {
    await close(server)
  }
})

test("fails when a referenced asset is unavailable", async () => {
  const server = createServer((request, response) => {
    if (request.url === "/missing.js") {
      response.writeHead(404)
      response.end("missing")
      return
    }
    response.writeHead(200, { "content-type": "text/html" })
    response.end('<script src="/missing.js"></script>')
  })
  await listen(server)
  try {
    const address = server.address()
    const report = await verifyUrl(`http://127.0.0.1:${address.port}`)
    assert.equal(report.ok, false)
    assert.equal(report.assets[0].status, 404)
  } finally {
    await close(server)
  }
})

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
}

function close(server) {
  return new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  )
}
