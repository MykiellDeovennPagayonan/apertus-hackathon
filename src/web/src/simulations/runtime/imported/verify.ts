import {
  type Diagnostic,
  diagnostic,
  inputValues,
  inspectSource,
  type VerificationReport,
} from "./contract";
import type { ComponentRunner, InitialContext } from "./runner";
export async function sourceHash(source: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(source),
  );
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export async function verifyComponent(
  source: string,
  runner: ComponentRunner,
  context: InitialContext,
  signal: AbortSignal,
  diagnostics: Diagnostic[],
  remount: () => ComponentRunner,
): Promise<VerificationReport> {
  const report: VerificationReport = {
    sourceHash: await sourceHash(source),
    apiVersion: 1,
    verifierVersion: "1",
    checkedAt: new Date().toISOString(),
    status: "incomplete",
    checks: [],
    diagnostics,
  };
  const check = async (id: string, run: () => void | Promise<void>) => {
    signal.throwIfAborted();
    try {
      await run();
      signal.throwIfAborted();
      report.checks.push({ id, status: "passed" });
    } catch (e) {
      report.checks.push({ id, status: signal.aborted ? "not-run" : "failed" });
      throw e;
    }
  };
  try {
    const manifest = inspectSource(source);
    await check("package", () => {
      inputValues(manifest, context.inputs);
    });
    await check("initialize", () => runner.request("initialize", context));
    await check("input-update", () =>
      runner.request("updateInputs", context.inputs),
    );
    await check("resize", () =>
      runner.request("resize", { ...context.viewport, width: 320 }),
    );
    await check("input-boundaries", async () => {
      for (const [name, d] of Object.entries(manifest.inputs)) {
        if (d.schema.type !== "number" && d.schema.type !== "integer") continue;
        for (const value of [d.schema.minimum, d.schema.maximum]) {
          const inputs = inputValues(manifest, {
            ...context.inputs,
            [name]: value,
          });
          await runner.request("updateInputs", inputs);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      await runner.request("updateInputs", context.inputs);
    });
    if (manifest.clock)
      await check("host-clock", async () => {
        for (let i = 1; i <= 3; i++)
          await runner.request("step", { time: i / 60, delta: 1 / 60 });
      });
    await check("reset", () => runner.request("reset", context));
    await check("resize-restored", () =>
      runner.request("resize", context.viewport),
    );
    await check("dispose", () => runner.request("dispose", null));
    runner.close();
    runner = remount();
    await check("remount", () => runner.request("initialize", context));
    for (const name of Object.keys(manifest.actions))
      report.checks.push({ id: `manual-action:${name}`, status: "not-run" });
    report.status = diagnostics.some((d) => d.severity === "error")
      ? "failed"
      : "passed";
  } catch (e) {
    report.status = signal.aborted ? "incomplete" : "failed";
    if (!signal.aborted && !diagnostics.length)
      diagnostics.push(diagnostic(e, "runtime"));
  }
  return report;
}
export function repairBrief(report: VerificationReport) {
  return `Repair this Apertus HTML component using API version 1. Return one complete HTML file.\nContract: register once; initialize/reset must emit every declared output; emit only finite JSON values matching declared schemas; host handlers run in order and must finish within 2 seconds. Use the manifest path, expected value, and reproduction below to fix the reported defect.\nOnly technical checks are covered; scientific correctness requires review.\n\n${JSON.stringify(report, null, 2)}`;
}
