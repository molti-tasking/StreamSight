import { flushSync } from "react-dom";

/** CSS view-transition-name for a cluster's chart (stable across layouts). */
export const clusterTransitionName = (clusterId: number) =>
  clusterId < 0 ? "cluster-outliers" : `cluster-${clusterId}`;

/**
 * Runs a React state update inside a view transition, so elements with the
 * same view-transition-name morph between their old and new position. Falls
 * back to a plain update when disabled, unsupported, or when the user prefers
 * reduced motion.
 */
export function withViewTransition(update: () => void, enabled: boolean) {
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!enabled || reducedMotion || typeof document === "undefined" || !document.startViewTransition) {
    update();
    return;
  }
  document.startViewTransition(() => flushSync(update));
}
