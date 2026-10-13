import { MotionConfig } from "framer-motion";
import { createContext, type SVGProps, useId, useState } from "react";
/** SVG surface; visual adapters supply projected geometry. Each view scopes its own defs with useId. */
export const SceneFeedbackContext = createContext<
  ((message: string) => void) | null
>(null);
export function SVGWorldView({
  scrollable = false,
  ...props
}: SVGProps<SVGSVGElement> & { scrollable?: boolean }) {
  const [feedback, setFeedback] = useState("");
  const feedbackId = useId();
  return (
    <MotionConfig reducedMotion="user">
      <SceneFeedbackContext.Provider value={setFeedback}>
        <section className="simulation-surface">
          <section
            className={
              scrollable ? "simulation-surface--scrollable" : undefined
            }
            aria-label={
              scrollable
                ? `Scrollable ${props["aria-label"] || "scene"}`
                : undefined
            }
            tabIndex={scrollable ? 0 : undefined}
          >
            <svg
              aria-label="Simulation diagram"
              role="img"
              aria-describedby={feedback ? feedbackId : undefined}
              {...props}
            />
          </section>
          <output
            id={feedbackId}
            className="simulation-feedback"
            aria-live="polite"
            aria-atomic="true"
          >
            {feedback}
          </output>
        </section>
      </SceneFeedbackContext.Provider>
    </MotionConfig>
  );
}
export function projectPoint(
  point: { x: number; y: number },
  origin: { x: number; y: number },
  scale: number,
  yUp = true,
) {
  return {
    x: origin.x + point.x * scale,
    y: origin.y + point.y * scale * (yUp ? -1 : 1),
  };
}
