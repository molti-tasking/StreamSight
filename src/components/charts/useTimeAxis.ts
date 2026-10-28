"use client";
import { dataSets } from "@/data/streamDataSet";
import { timeAxisFormat, timeDomain, TimeAxisKind } from "@/lib/timeAxis";
import { usePlaybackStore } from "@/store/usePlaybackStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import { useMemo } from "react";

/** Whether the current source's timestamps are relative or wall-clock. */
export function useTimeAxisKind(): TimeAxisKind {
  const source = usePlaybackStore((s) => s.source);
  if (!source || source.kind === "synthetic") return "relative";
  return dataSets[source.dataSet].timeAxis;
}

/**
 * The shared x scale and axis for cluster charts: every chart spans the same
 * window (so charts side by side start and end at the same time) and every
 * axis carries a unit.
 */
export function useTimeAxis() {
  const kind = useTimeAxisKind();
  const aggregated = useViewModelStore((s) => s.aggregated);
  const domain = useMemo(() => timeDomain(aggregated), [aggregated]);
  return useMemo(() => {
    const format = timeAxisFormat(kind, domain[1] - domain[0]);
    return {
      domain,
      format,
      scale: { type: format.utc ? ("utc" as const) : ("time" as const), domain },
      axis: {
        // No formatType: Vega-Lite 6 drops "utc" as a custom type; the
        // scale type (utc / time) already decides how labels are formatted.
        format: format.format,
        title: format.title,
        titleFontSize: 9,
        titleFontWeight: "normal" as const,
        titleColor: "#6b7280",
        labelFontSize: 9,
        ...(format.tickMinStep ? { tickMinStep: format.tickMinStep } : {}),
      },
    };
  }, [kind, domain]);
}
