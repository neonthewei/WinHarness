const ASSET_PATTERN = /<(?:script\b[^>]*\bsrc|link\b[^>]*\bhref)\s*=\s*["']([^"']+)["']/gi

export async function verifyUrl(input, options = {}) {
  const url = new URL(input)
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`unsupported verification protocol: ${url.protocol}`)
  }
  const timeoutMs = positiveNumber(options.timeoutMs, 10_000)
  const expectedStatus = options.expectedStatus ? Number(options.expectedStatus) : undefined
  const root = await fetchCheck(url, { timeoutMs, expectedStatus })
  const assets = []

  if (options.assets !== false && root.ok && root.contentType.includes("text/html")) {
    const references = uniqueAssets(root.body, url, options.maxAssets ?? 50)
    const checks = await Promise.all(
      references.map((asset) => fetchCheck(asset, { timeoutMs }))
    )
    assets.push(...checks)
  }

  return {
    version: 1,
    ok: root.ok && assets.every((asset) => asset.ok),
    root: withoutBody(root),
    assets: assets.map(withoutBody),
  }
}

export function printVerification(report, { json = false, io = console } = {}) {
  if (json) {
    io.log(JSON.stringify(report, null, 2))
    return
  }
  io.log(`${report.ok ? "PASS" : "FAIL"} root ${report.root.status ?? "-"} ${report.root.url}`)
  for (const asset of report.assets) {
    io.log(`${asset.ok ? "PASS" : "FAIL"} asset ${asset.status ?? "-"} ${asset.url}`)
  }
  if (report.assets.length) io.log(`${report.assets.length} same-origin script/style asset(s) checked.`)
}

async function fetchCheck(url, options) {
  const started = Date.now()
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(options.timeoutMs),
      headers: { "user-agent": "WinHarness/0.2" },
    })
    const body = await response.text()
    const statusOk = options.expectedStatus
      ? response.status === options.expectedStatus
      : response.status >= 200 && response.status < 400
    return {
      ok: statusOk,
      url: response.url,
      status: response.status,
      durationMs: Date.now() - started,
      contentType: response.headers.get("content-type") ?? "",
      body,
    }
  } catch (error) {
    return {
      ok: false,
      url: String(url),
      durationMs: Date.now() - started,
      error: error.message,
      contentType: "",
      body: "",
    }
  }
}

function uniqueAssets(html, base, limit) {
  const values = []
  for (const match of html.matchAll(ASSET_PATTERN)) {
    if (values.length >= limit) break
    try {
      const url = new URL(match[1], base)
      if (url.origin !== base.origin || !["http:", "https:"].includes(url.protocol)) continue
      if (!values.some((value) => value.href === url.href)) values.push(url)
    } catch {}
  }
  return values
}

function withoutBody(result) {
  const { body, ...publicResult } = result
  return publicResult
}

function positiveNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}
