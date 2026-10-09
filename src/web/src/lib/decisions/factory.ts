import type { DecisionConfig } from "./config";
import type { DecisionProvider } from "./contracts";
import { createJevProvider } from "./providers/jev";
import { createLayaProvider } from "./providers/laya";
import { createHttpTransport } from "./transport/http";
export function createDecisionProvider(
  config: DecisionConfig,
  fetcher?: typeof fetch,
): DecisionProvider {
  const transport = createHttpTransport(config.timeout, fetcher);
  switch (config.provider) {
    case "laya":
      return createLayaProvider(config, transport);
    case "jev":
      return createJevProvider(config, transport);
  }
}
