import {
  type PointerEvent,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ActionResult } from "../../../creation-and-editing/runtime-engine/commands";
import type { UIAction } from "../../runtime/types";
import { SceneFeedbackContext } from "../views/SVGWorldView";
/** SVG picking coordinates are explicitly mapped into a domain edit. */
export function DragHandleControl({
  onCommand,
  target,
  cx,
  cy,
  map,
  label,
  keyboardStep = 8,
}: {
  onCommand: (command: UIAction) => ActionResult;
  target: string;
  cx: number;
  cy: number;
  map: (x: number, y: number) => UIAction;
  label: string;
  keyboardStep?: number;
}) {
  const dragging = useRef(false);
  const report = useContext(SceneFeedbackContext);
  const [feedback, setFeedback] = useState("");
  const submit = (command: UIAction) => {
    const result = onCommand(command);
    const message = result.accepted ? "" : result.error;
    setFeedback(message);
    report?.(message);
  };
  const finish = (event: PointerEvent<SVGCircleElement>) => {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const handle = useRef<SVGCircleElement>(null);
  const [radius, setRadius] = useState(22);
  useEffect(() => {
    const svg = handle.current?.ownerSVGElement;
    if (!svg) return;
    const measure = () => {
      const scale = svg.getScreenCTM()?.a ?? 1;
      setRadius(Math.max(18, 22 / Math.abs(scale || 1)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    // An adaptive viewBox can change projection without changing the SVG's box.
    const projection = new MutationObserver(measure);
    projection.observe(svg, { attributes: true, attributeFilter: ["viewBox"] });
    const boardItem = svg.closest(".board-item");
    if (boardItem)
      projection.observe(boardItem, {
        attributes: true,
        attributeFilter: ["style"],
      });
    return () => {
      observer.disconnect();
      projection.disconnect();
    };
  }, []);
  const send = (event: PointerEvent<SVGCircleElement>) => {
    const svg = event.currentTarget.ownerSVGElement,
      matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const mapped = point.matrixTransform(matrix.inverse());
    submit({ ...map(mapped.x, mapped.y), target });
  };
  return (
    <g>
      {/* biome-ignore lint/a11y/useSemanticElements: SVG handles use keyboard commands; HTML buttons cannot replace scene geometry. */}
      <circle
        cx={cx}
        cy={cy}
        ref={handle}
        r={radius}
        fill="transparent"
        stroke="var(--accent)"
        strokeDasharray="3 3"
        style={{ cursor: "grab", touchAction: "none" }}
        role="button"
        tabIndex={0}
        aria-label={label}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          send(e);
        }}
        onPointerMove={(e) => {
          if (dragging.current) send(e);
        }}
        onPointerUp={finish}
        onPointerCancel={(event) => {
          finish(event);
          setFeedback("Movement stopped. The last accepted position is kept.");
          report?.("Movement stopped. The last accepted position is kept.");
        }}
        onLostPointerCapture={() => {
          dragging.current = false;
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && dragging.current) {
            dragging.current = false;
            setFeedback(
              "Movement stopped. The last accepted position is kept.",
            );
            report?.("Movement stopped. The last accepted position is kept.");
            return;
          }
          if (
            !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
          )
            return;
          e.preventDefault();
          const step = keyboardStep * (e.shiftKey ? 0.1 : 1);
          submit({
            ...map(
              cx +
                (e.key === "ArrowRight"
                  ? step
                  : e.key === "ArrowLeft"
                    ? -step
                    : 0),
              cy +
                (e.key === "ArrowDown"
                  ? step
                  : e.key === "ArrowUp"
                    ? -step
                    : 0),
            ),
            target,
          });
        }}
      />
      {feedback && !report && (
        <foreignObject x="0" y="0" width="100%" height="70">
          <output className="simulation-feedback" aria-live="polite">
            {feedback}
          </output>
        </foreignObject>
      )}
    </g>
  );
}
