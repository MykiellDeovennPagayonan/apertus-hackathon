const fs = require("node:fs"),
  path = require("node:path");
const { execFileSync } = require("node:child_process");
const { sourceFingerprint } = require("../science/source-fingerprint.cjs");
const root = path.resolve(
  __dirname,
  "../../../../../docs/agent-only/implementation/027-validation",
);
const write = (dir, name, value) =>
  fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + "\n");
function allocate(kind, topic, prompt = "") {
  fs.mkdirSync(path.join(root, "runs"), { recursive: true });
  execFileSync("git", [
    "check-ignore",
    path.join(root, "runs", "001", "manifest.json"),
  ]);
  const existing = fs
    .readdirSync(path.join(root, "runs"))
    .filter((n) => /^\d+$/.test(n))
    .map(Number);
  let n = Math.max(0, ...existing) + 1,
    dir;
  for (;;) {
    dir = path.join(root, "runs", String(n).padStart(3, "0"));
    try {
      fs.mkdirSync(dir);
      break;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      n++;
    }
  }
  fs.mkdirSync(path.join(dir, "screenshots"));
  const record = {
    run: String(n).padStart(3, "0"),
    kind,
    topic,
    prompt,
    status: "running",
    started: new Date().toISOString(),
    fingerprint: sourceFingerprint(),
    browserMethod: "Standalone Playwright fallback; Playwright MCP unavailable",
    viewport: { width: 1440, height: 900 },
    motion: "reduce",
    screenshots: [],
    findings: [],
  };
  fs.writeFileSync(path.join(dir, "prompt.txt"), prompt + "\n");
  write(dir, "manifest.json", record);
  index();
  return { dir, record };
}
function index() {
  const dirs = fs
    .readdirSync(path.join(root, "runs"))
    .filter((n) => /^\d+$/.test(n))
    .sort((a, b) => Number(a) - Number(b));
  const records = dirs.map((n) => {
    try {
      return JSON.parse(
        fs.readFileSync(path.join(root, "runs", n, "manifest.json")),
      );
    } catch {
      return { run: n, status: "interrupted" };
    }
  });
  fs.writeFileSync(
    path.join(root, "INDEX.md"),
    "# Numbered Earth and atmosphere verification\n\nEvery attempt is retained. Browser evidence uses standalone Playwright; MCP is unavailable. Screenshot inspection is reported separately from capture.\n\n| Run | Kind | Topic / exact prompt | Result | Evidence |\n| --- | --- | --- | --- | --- |\n" +
      records
        .map(
          (r) =>
            `| ${r.run} | ${r.kind || ""} | ${(r.topic || "") + " · " + (r.prompt || "").replaceAll("|", "/")} | ${r.status}${r.error ? " · " + r.error.split("\n")[0].replaceAll("|", "/") : ""} | [manifest](runs/${r.run}/manifest.json) |`,
        )
        .join("\n") +
      "\n",
  );
  const lines = [
    "# Screenshot progress\n",
    "Captures are evidence of appearance. See each manifest for interaction checks and whether direct review occurred.\n",
  ];
  let html =
    '<!doctype html><meta charset="utf-8"><title>027 numbered review gallery</title><style>body{font:16px system-ui;background:#eee9dc;color:#30362e;margin:32px}section{margin-bottom:40px}img{max-width:100%;border:1px solid #d5cdbb}figure{display:inline-block;width:46%;vertical-align:top;margin:1%}figcaption{padding:8px}a{color:#285e56}</style><h1>Earth and atmosphere: numbered progress</h1>';
  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll('"', "&quot;");
  for (const r of records) {
    lines.push(`\n## Run ${r.run} — ${r.topic} — ${r.status}\n`);
    html += `<section><h2>Run ${r.run} · ${esc(r.topic)} · ${r.status}</h2><p>${esc(r.prompt)}</p>`;
    for (const file of r.screenshots || []) {
      const ref = `runs/${r.run}/screenshots/${file}`;
      lines.push(`\n[${file}](${ref})\n\n![Run ${r.run}: ${file}](${ref})\n`);
      html += `<figure><a href="${ref}"><img loading="lazy" src="${ref}"></a><figcaption>${esc(file)}</figcaption></figure>`;
    }
    html += "</section>";
  }
  fs.writeFileSync(path.join(root, "SCREENSHOTS.md"), lines.join("\n"));
  fs.writeFileSync(path.join(root, "gallery.html"), html);
}
async function capture(page, run, name) {
  let file = name + ".png",
    copy = 2;
  while (fs.existsSync(path.join(run.dir, "screenshots", file)))
    file = name + "-" + copy++ + ".png";
  await page.screenshot({ path: path.join(run.dir, "screenshots", file) });
  run.record.screenshots.push(file);
  write(run.dir, "manifest.json", run.record);
  index();
}
function finish(run, status, error) {
  Object.assign(run.record, {
    status,
    ended: new Date().toISOString(),
    ...(error ? { error: String(error.stack || error) } : {}),
  });
  write(run.dir, "manifest.json", run.record);
  index();
}
exports.root = root;
exports.write = write;
exports.allocate = allocate;
exports.capture = capture;
exports.finish = finish;
exports.index = index;
