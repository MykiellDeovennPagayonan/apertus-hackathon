// Official Playwright MCP client; never imports a CLI browser or intercepts model requests.
const fs = require("node:fs"),
  path = require("node:path");
const installation =
  process.env.PLAYWRIGHT_MCP_ROOT ||
  "/private/tmp/apertus-005-mcp/node_modules";
const { Client } = require(
  path.join(installation, "@modelcontextprotocol/sdk/dist/cjs/client/index.js"),
);
const { StdioClientTransport } = require(
  path.join(installation, "@modelcontextprotocol/sdk/dist/cjs/client/stdio.js"),
);
const scenario = require("./live-scenario.cjs");
const baseUrl = process.env.AGENT_B_BASE_URL || "http://localhost:43120";
const directory =
  process.env.AGENT_B_LIVE_RAW_DIR ||
  `/private/tmp/apertus-006-agent-b-live-${Date.now()}`;
fs.mkdirSync(directory, { recursive: true });
const summary = {
  tool: "@playwright/mcp",
  version: require(path.join(installation, "@playwright/mcp/package.json"))
    .version,
  baseUrl,
  startedAt: new Date().toISOString(),
  cases: [],
};
const parse = (result) => {
  const text = result.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");
  const match = text.match(/### Result\n([\s\S]*?)(?:\n### |$)/);
  if (!match) throw Error(text.slice(0, 3000));
  return JSON.parse(match[1]);
};
(async () => {
  for (const width of process.env.AGENT_B_WIDTH
    ? [Number(process.env.AGENT_B_WIDTH)]
    : [1440, 390])
    for (const name of process.env.AGENT_B_CASE
      ? [process.env.AGENT_B_CASE]
      : ["pendulum", "rolling", "circuit"]) {
      const current = path.join(directory, `${name}-${width}`);
      fs.mkdirSync(current, { recursive: true });
      const client = new Client({ name: "apertus-agent-b-live", version: "1" });
      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [
          path.join(installation, "@playwright/mcp/cli.js"),
          "--headless",
          "--isolated",
          "--executable-path",
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "--output-dir",
          current,
          "--image-responses",
          "omit",
          "--timeout-action",
          "185000",
        ],
        cwd: path.resolve(__dirname, "../../.."),
        stderr: "pipe",
      });
      try {
        await client.connect(transport);
        const tools = await client.listTools();
        fs.writeFileSync(
          path.join(current, "tools.json"),
          JSON.stringify(tools, null, 2),
        );
        const args = {
          name,
          width,
          directory: current,
          baseUrl,
          promptOverride: process.env.AGENT_B_PROMPT,
          creationOnly: process.env.AGENT_B_CREATION_ONLY === "true",
          expectedParameters: process.env.AGENT_B_EXPECTED
            ? JSON.parse(process.env.AGENT_B_EXPECTED)
            : undefined,
          expectedGraph: process.env.AGENT_B_EXPECT_GRAPH === "true",
        };
        console.log(
          `Starting live MCP ${name} ${width}; raw evidence ${current}`,
        );
        const raw = await client.callTool(
          {
            name: "browser_run_code_unsafe",
            arguments: {
              code: `async (page) => { const scenario = ${scenario.toString()}; return await scenario(page, ${JSON.stringify(args)}); }`,
            },
          },
          undefined,
          { timeout: 600000 },
        );
        fs.writeFileSync(
          path.join(current, "mcp-result.json"),
          JSON.stringify(raw),
        );
        const result = parse(raw);
        for (const [tool, args] of [
          ["browser_console_messages", { level: "error", all: true }],
          ["browser_network_requests", { static: false }],
        ]) {
          const diagnostics = await client.callTool(
            { name: tool, arguments: args },
            undefined,
            { timeout: 30000 },
          );
          fs.writeFileSync(
            path.join(current, `${tool}.json`),
            JSON.stringify(diagnostics, null, 2),
          );
        }
        fs.writeFileSync(
          path.join(current, "result.json"),
          JSON.stringify(result, null, 2),
        );
        summary.cases.push(result);
        console.log(
          `Live MCP ${name} ${width}: ${result.status}${result.error ? ` ${result.error.split("\n")[0]}` : ""}; requests: ${result.requests.map((r) => `${r.status}/${r.elapsedMs}ms`).join(", ")}`,
        );
        if (result.status !== "passed") {
          process.exitCode = 1;
          if (process.env.AGENT_B_CONTINUE !== "true") break;
        }
      } catch (error) {
        console.error(error);
        summary.cases.push({
          name,
          width,
          status: "failed",
          error: String(error),
        });
        process.exitCode = 1;
        break;
      } finally {
        await client.close();
        fs.writeFileSync(
          path.join(directory, "summary.json"),
          JSON.stringify(summary, null, 2),
        );
      }
    }
})();
