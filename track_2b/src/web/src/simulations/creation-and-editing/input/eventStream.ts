import { STREAM_BYTE_LIMIT, STREAM_FRAME_BYTE_LIMIT } from "../simulation/construction/contracts";

export type EventWriter = {
  send(event: unknown, operationSignal?: AbortSignal): Promise<void>;
  progress(event: unknown): void;
};

/** Byte-bounded stream. Slow consumers apply backpressure to construction, not inference traces. */
export function generationEventStream(
  external: AbortSignal,
  run: (writer: EventWriter, signal: AbortSignal) => Promise<void>,
) {
  const cancellation = new AbortController();
  const signal = AbortSignal.any([external, cancellation.signal]);
  let closed = false;
  let wake: (() => void) | undefined;
  let bytes = 0;
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>(
    {
      start(controller) {
        const encode = (event: unknown) => {
          const frame = encoder.encode(`${JSON.stringify(event)}\n`);
          if (
            frame.byteLength > STREAM_FRAME_BYTE_LIMIT ||
            bytes + frame.byteLength > STREAM_BYTE_LIMIT
          )
            throw new Error("Generation stream exceeds byte budget");
          bytes += frame.byteLength;
          return frame;
        };
        const abort = () => {
          wake?.();
        };
        signal.addEventListener("abort", abort, { once: true });
        const writer: EventWriter = {
          async send(event, operationSignal) {
            const active = operationSignal
              ? AbortSignal.any([signal, operationSignal])
              : signal;
            active.throwIfAborted();
            const frame = encode(event);
            const unblock = () => {
              wake?.();
            };
            active.addEventListener("abort", unblock, { once: true });
            try {
              while (!closed && (controller.desiredSize ?? 0) <= 0) {
                await new Promise<void>((resolve) => {
                  wake = resolve;
                });
                wake = undefined;
                active.throwIfAborted();
              }
              if (closed)
                throw new DOMException("Stream cancelled", "AbortError");
              active.throwIfAborted();
              controller.enqueue(frame);
            } finally {
              active.removeEventListener("abort", unblock);
            }
          },
          progress(event) {
            if (!closed && !signal.aborted && (controller.desiredSize ?? 0) > 0)
              controller.enqueue(encode(event));
          },
        };
        // Returning the run promise from start would prevent pull and deadlock backpressure.
        void run(writer, signal)
          .then(
            () => {
              if (!closed) {
                closed = true;
                controller.close();
              }
            },
            (error: unknown) => {
              if (!closed) {
                closed = true;
                controller.error(error);
              }
            },
          )
          .finally(() => signal.removeEventListener("abort", abort));
      },
      pull() {
        wake?.();
      },
      cancel() {
        closed = true;
        cancellation.abort();
        wake?.();
      },
    },
    {
      highWaterMark: STREAM_FRAME_BYTE_LIMIT * 2,
      size: (frame) => frame.byteLength,
    },
  );
}
