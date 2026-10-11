import { createHash, randomBytes, randomUUID } from "node:crypto";
import { validateRunConfiguration } from "../../simulations/components/systems/AgentSystems";
import {
  AgentError,
  runView,
} from "../../simulations/runtime/agents/contracts";
import { MemoryRunRepository } from "../../simulations/runtime/agents/memoryRepository";
import {
  AgentRunner,
  createAgentRun,
} from "../../simulations/runtime/agents/runner";
import { resolveAgentScenario } from "../../simulations/runtime/agents/scenarios";
import { AgentWorkQueue } from "../../simulations/runtime/agents/scheduler";
import { getLibrarySession } from "../auth/server";
import { getDatabase } from "../database/client";
import { configuredModelIdentity, createAgentModel } from "./model";
import { MongoRunRepository } from "./mongoRepository";

declare global {
  var agentGuestRepository: MemoryRunRepository | undefined;
  var agentWorkQueue: AgentWorkQueue | undefined;
}
const guests = () =>
  (globalThis.agentGuestRepository ??= new MemoryRunRepository());
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

async function boundedBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new AgentError("Send JSON.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AgentError("Request body is missing.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32000) {
        await reader.cancel();
        throw new AgentError("Agent request too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const raw = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new Error();
    return raw;
  } catch {
    throw new AgentError("Invalid JSON.");
  }
}

/** Guest handles are scoped bearer capabilities; account runs use verified sessions. */
export async function handleAgentRequest(request: Request) {
  const respond = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
  try {
    if (
      request.headers.get("origin") !==
      new URL(process.env.NEXTAUTH_URL ?? request.url).origin
    )
      throw new AgentError("Use the application's origin.", 403);
    const body = await boundedBody(request);
    const session = await getLibrarySession();
    const account = session?.user.id || null;
    const repository = account
      ? new MongoRunRepository((await getDatabase()).db)
      : guests();
    if (body.operation === "create") {
      validateRunConfiguration(body.configuration);
      const scenario = resolveAgentScenario(body.configuration);
      // The public communication adapter admits speech; arbitrary tool capabilities are not exposed by HTTP.
      if (body.configuration.capabilities.some((action) => action !== "speak"))
        throw new AgentError(
          "This endpoint supports communication actions only.",
        );
      const token = account ? undefined : randomBytes(32).toString("hex");
      const owner = account
        ? `account:${account}`
        : `guest:${hash(token as string)}`;
      const run = createAgentRun(
        randomUUID(),
        owner,
        body.configuration,
        configuredModelIdentity(),
      );
      if (scenario) run.nextActor = scenario.policy.selectActor(run);
      await repository.create(run);
      return respond({
        handle: { id: run.id, ...(token ? { token } : {}) },
        run: runView(run),
        persistence: account ? "database" : "process",
      });
    }
    if (!body.handle || typeof body.handle !== "object")
      throw new AgentError("Provide a run handle.");
    const handle = body.handle as { id?: unknown; token?: unknown };
    if (typeof handle.id !== "string" || !/^[a-f0-9-]{36}$/.test(handle.id))
      throw new AgentError("Invalid run identity.");
    if (
      !account &&
      (typeof handle.token !== "string" || !/^[a-f0-9]{64}$/.test(handle.token))
    )
      throw new AgentError("Run access unavailable.", 403);
    const owner = account
      ? `account:${account}`
      : `guest:${hash(handle.token as string)}`;
    const current = await repository.read(handle.id, owner);
    if (body.operation === "read") return respond({ run: runView(current) });
    if (body.operation === "cancel")
      return respond({
        run: runView(
          await new AgentRunner(repository).cancel(handle.id, owner),
        ),
      });
    const scenario = resolveAgentScenario(current.configuration);
    const runner = new AgentRunner(
      repository,
      createAgentModel(current.model),
      scenario?.environment,
      undefined,
      scenario?.policy,
    );
    if (
      body.operation !== "step" ||
      !Number.isSafeInteger(body.expectedRevision) ||
      Number(body.expectedRevision) < 0
    )
      throw new AgentError("Provide a valid step revision.");
    try {
      const signal = AbortSignal.any([
        request.signal,
        AbortSignal.timeout(120000),
      ]);
      if (!globalThis.agentWorkQueue)
        globalThis.agentWorkQueue = new AgentWorkQueue();
      const queue = globalThis.agentWorkQueue;
      const run = await queue.submit(`${owner}:${handle.id}`, signal, () =>
        runner.step(
          handle.id as string,
          owner,
          Number(body.expectedRevision),
          signal,
        ),
      );
      return respond({ run: runView(run) });
    } catch (error) {
      if (!(error instanceof AgentError)) throw error;
      return respond(
        {
          error: error.message,
          run: runView(await repository.read(handle.id, owner)),
        },
        error.status === 499 ? 408 : error.status,
      );
    }
  } catch (error) {
    return respond(
      {
        error:
          error instanceof AgentError
            ? error.message
            : "Agent service unavailable. Check model and storage configuration.",
      },
      error instanceof AgentError ? error.status : 503,
    );
  }
}
