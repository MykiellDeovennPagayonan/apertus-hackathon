/** API available inside an imported HTML component; no build step is required. */
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
interface Viewport { width: number; height: number; pixelRatio: number }
interface Context { settings: Record<string, JsonValue>; inputs: Record<string, JsonValue>; viewport: Viewport }
interface ComponentImplementation {
  initialize(context: Context): void | Promise<void>;
  updateInputs(inputs: Record<string, JsonValue>): void | Promise<void>;
  resize(viewport: Viewport): void | Promise<void>;
  reset(context: Context): void | Promise<void>;
  dispose(): void | Promise<void>;
  /** Required when manifest.clock is true. Seconds, controlled by the host. */
  step?(clock: { time: number; delta: number }): void | Promise<void>;
  /** Required when the manifest declares actions. */
  action?(name: string, arguments_: Record<string, JsonValue>): void | Promise<void>;
}
interface ApertusAPI {
  register(implementation: ComponentImplementation): void;
  emit(name: string, value: JsonValue): void;
  reportError(error: { code: string; message: string }): void;
}
interface Window { readonly apertus: ApertusAPI }
declare const apertus: ApertusAPI;
