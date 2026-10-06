import { AUTHORING_INSTRUCTIONS } from "../apertus/prompts";
import type { Message } from "../apertus/transport";
import type { TeachingIntent } from "./schema";

/** A stage is fresh context, never a transcript, complete document, or topology dump. */
export function stageMessages(
  stage: string,
  prompt: string,
  contract: unknown,
  intent?: TeachingIntent,
  relevant?: unknown,
): Message[] {
  const data = {
    task: stage,
    originalRequest: prompt,
    ...(intent ? { acceptedIntent: intent } : {}),
    contract,
    ...(relevant ? { relevant } : {}),
  };
  const user = JSON.stringify(data);
  if (user.length > 24000)
    throw new Error("Stage context exceeds its bounded input size");
  return [
    { role: "system", content: AUTHORING_INSTRUCTIONS },
    { role: "user", content: user },
  ];
}
