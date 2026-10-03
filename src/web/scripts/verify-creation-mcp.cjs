// Real JSON-RPC client to the official Playwright MCP server. No CLI browser import.
const fs = require("node:fs"),
  path = require("node:path"),
  cp = require("node:child_process");
const installation =
  process.env.PLAYWRIGHT_MCP_ROOT || "/tmp/apertus-005-mcp/node_modules";
const { Client } = require(
  path.join(installation, "@modelcontextprotocol/sdk/dist/cjs/client/index.js"),
);
const { StdioClientTransport } = require(
  path.join(installation, "@modelcontextprotocol/sdk/dist/cjs/client/stdio.js"),
);
const scenario = require("./creation-mcp-scenario.cjs");
const baseUrl = process.env.CREATION_BASE_URL || "http://127.0.0.1:43100";
const candidate = cp
  .execFileSync(
    process.execPath,
    [path.join(__dirname, "record-creation-candidate.cjs")],
    { encoding: "utf8" },
  )
  .trim();
const attempt = process.env.CREATION_MCP_ATTEMPT || "mcp-attempt-01";
const output = path.join(candidate, attempt);
if (fs.existsSync(output))
  throw Error("Refusing to overwrite an existing evidence attempt");
fs.mkdirSync(output, { recursive: true });
const summary = {
  candidate,
  attempt,
  tool: "@playwright/mcp",
  version: require(path.join(installation, "@playwright/mcp/package.json"))
    .version,
  startedAt: new Date().toISOString(),
  consecutivePasses: 0,
  passes: [],
};
const parseResult = (result) => {
  const text = result.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");
  const match = text.match(/### Result\n([\s\S]*?)(?:\n### |$)/);
  if (!match) throw Error(`Missing MCP result: ${text.slice(0, 1000)}`);
  return JSON.parse(match[1]);
};
(async () => {
  for (let pass = 1; pass <= 2; pass++) {
    const cases = [];
    summary.passes.push({ pass, cases });
    for (const script of [
      "verify-creation.cjs",
      "verify-planner.cjs",
      "verify-simulations.cjs",
      "verify-integration.cjs",
    ]) {
      const log = cp.execFileSync(
        process.execPath,
        [path.join(__dirname, script)],
        {
          cwd: path.resolve(__dirname, ".."),
          encoding: "utf8",
          timeout: 180000,
        },
      );
      fs.writeFileSync(path.join(output, `pass-${pass}-${script}.log`), log);
    }
    for (const width of [1440, 390])
      for (const name of ["division", "ball", "gas"]) {
        const current = cp
          .execFileSync(
            process.execPath,
            [path.join(__dirname, "record-creation-candidate.cjs")],
            { encoding: "utf8" },
          )
          .trim();
        if (current !== candidate)
          throw Error("Candidate source changed during acceptance");
        const directory = path.join(
          output,
          `pass-${String(pass).padStart(2, "0")}`,
          `${name}-${width}`,
        );
        fs.mkdirSync(directory, { recursive: true });
        const client = new Client({
          name: "apertus-005-acceptance",
          version: "1.0",
        });
        const transport = new StdioClientTransport({
          command: process.execPath,
          args: [
            path.join(installation, "@playwright/mcp/cli.js"),
            "--headless",
            "--isolated",
            "--executable-path",
            process.env.BROWSER_EXECUTABLE_PATH ||
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "--output-dir",
            directory,
            "--save-session",
            "--image-responses",
            "omit",
            "--timeout-action",
            "125000",
          ],
          cwd: path.resolve(__dirname, ".."),
          stderr: "pipe",
        });
        const transcript = [];
        try {
          await client.connect(transport);
          const tools = await client.listTools();
          fs.writeFileSync(
            path.join(directory, "mcp-tools.json"),
            JSON.stringify(tools, null, 2),
          );
          const invoke = async (name, args) => {
            const startedAt = new Date().toISOString();
            const result = await client.callTool(
              { name, arguments: args },
              undefined,
              { timeout: 360000 },
            );
            transcript.push({ name, arguments: args, startedAt, result });
            if (result.isError) throw Error(JSON.stringify(result));
            return result;
          };
          await invoke("browser_navigate", {
            url: `${baseUrl}/experiments`,
          });
          const result = await invoke("browser_run_code_unsafe", {
            code: `async (page) => { const scenario = ${scenario.toString()}; return await scenario(page, ${JSON.stringify({ name, width, directory, baseUrl })}); }`,
          });
          const evidence = parseResult(result);
          fs.writeFileSync(
            path.join(directory, "result.json"),
            JSON.stringify(evidence, null, 2),
          );
          cases.push({
            name,
            width,
            status: evidence.status,
            error: evidence.error,
          });
          await invoke("browser_snapshot", {});
          await invoke("browser_console_messages", {
            level: "error",
            all: true,
          });
          await invoke("browser_network_requests", { static: false });
          console.log(
            `MCP pass ${pass}: ${name} ${width}: ${evidence.status}${evidence.error ? ` ${evidence.error.split("\n")[0]}` : ""}`,
          );
        } catch (error) {
          cases.push({
            name,
            width,
            status: "failed",
            error: String(error.stack || error),
          });
          console.error(`${name} ${width}: ${error.message}`);
        } finally {
          fs.writeFileSync(
            path.join(directory, "mcp-transcript.json"),
            JSON.stringify(transcript, null, 2),
          );
          await client.close();
          fs.writeFileSync(
            path.join(output, "summary.json"),
            JSON.stringify(summary, null, 2),
          );
        }
      }
    if (cases.length !== 6 || cases.some((c) => c.status !== "passed")) {
      summary.consecutivePasses = 0;
      process.exitCode = 1;
      break;
    }
    summary.consecutivePasses++;
  }
  summary.finishedAt = new Date().toISOString();
  fs.writeFileSync(
    path.join(output, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(
    JSON.stringify({ output, consecutivePasses: summary.consecutivePasses }),
  );
})().catch((error) => {
  summary.error = String(error.stack || error);
  summary.consecutivePasses = 0;
  fs.writeFileSync(
    path.join(output, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  console.error(error);
  process.exitCode = 1;
});
