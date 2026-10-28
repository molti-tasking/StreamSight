"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { renderStarted } from "@/lib/bench/instrument";
import { useVegaEmbed } from "react-vega";
import type { EmbedOptions, VisualizationSpec } from "vega-embed";

export const VL_SCHEMA = "https://vega.github.io/schema/vega-lite/v6.json";

type Datasets = Record<string, unknown[]>;

/**
 * Moves every inline `data: { values }` (top level or inside layers) into
 * named datasets, so the remaining spec only describes chart structure.
 * Dataset names are assigned in traversal order, which is stable for a given
 * spec shape.
 */
export function hoistInlineData(spec: VisualizationSpec): {
  structure: VisualizationSpec;
  datasets: Datasets;
} {
  const datasets: Datasets = {};
  let index = 0;
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      const inline = value as { values?: unknown } | null;
      if (
        key === "data" &&
        inline &&
        typeof inline === "object" &&
        Array.isArray(inline.values)
      ) {
        const name = `inline_${index++}`; // not "data_N": Vega-Lite uses those itself
        datasets[name] = inline.values;
        const rest = { ...(inline as Record<string, unknown>) };
        delete rest.values;
        out[key] = { ...rest, name };
      } else {
        out[key] = walk(value);
      }
    }
    return out;
  };
  return { structure: walk(spec) as VisualizationSpec, datasets };
}

/** Live Vega views by their container element (for vector export). */
export const vegaViews = new Map<HTMLElement, NonNullable<ReturnType<typeof useVegaEmbed>>["view"]>();

export type VegaChartProps = {
  spec: VisualizationSpec;
  /** Show the vega-embed action menu (export, view source). */
  actions?: boolean;
  /** Signal listeners, keyed by signal (param) name. */
  signals?: Record<string, (name: string, value: unknown) => void>;
  /** Called once the view has re-rendered new data and a frame has passed. */
  onRendered?: (ms: number) => void;
  /**
   * Values for top-level params declared in the spec (e.g. scale domains via
   * `{expr: "[xmin, xmax]"}`). Pushed into the live view like data, so
   * changing them does not rebuild the view.
   */
  params?: Record<string, unknown>;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "onError">;

/**
 * The single entry point for Vega-Lite charts.
 *
 * - Renders on canvas (vega-embed 7 defaults to SVG).
 * - Re-embeds only when the chart *structure* changes. New data is pushed
 *   into the live view with `view.data()`, so streaming ticks do not rebuild
 *   the view (and interaction state such as a brush survives).
 */
export const VegaChart = ({
  spec,
  actions = false,
  signals,
  onRendered,
  params,
  ...divProps
}: VegaChartProps) => {
  const paramsKey = JSON.stringify(params ?? {});
  const ref = useRef<HTMLDivElement>(null);
  const { structure, datasets } = useMemo(() => hoistInlineData(spec), [spec]);
  const structureKey = useMemo(() => JSON.stringify(structure), [structure]);

  // Re-embed only when the structure changes; the datasets of that render
  // seed the new view (adjusting state during render, not in an effect).
  const [embedded, setEmbedded] = useState(() => ({
    key: structureKey,
    spec: { ...structure, datasets } as VisualizationSpec,
  }));
  if (embedded.key !== structureKey) {
    setEmbedded({
      key: structureKey,
      spec: { ...structure, datasets } as VisualizationSpec,
    });
  }

  const options = useMemo<EmbedOptions>(
    () => ({ actions, renderer: "canvas", mode: "vega-lite" }),
    [actions]
  );
  const result = useVegaEmbed({ ref, spec: embedded.spec, options });
  const view = result?.view;

  // Render tracking (end-to-end latency): a (re-)embed is pending until the
  // new view exists; a data push is pending until the view has re-run.
  const embedSettled = useRef<() => void>(undefined);
  useLayoutEffect(() => {
    const settle = renderStarted();
    embedSettled.current = settle;
    return settle;
  }, [embedded.spec]);
  useLayoutEffect(() => {
    if (view) embedSettled.current?.();
    const element = ref.current;
    if (!view || !element) return;
    vegaViews.set(element, view);
    return () => {
      vegaViews.delete(element);
    };
  }, [view]);

  const onRenderedRef = useRef(onRendered);
  const signalsRef = useRef(signals);
  useEffect(() => {
    onRenderedRef.current = onRendered;
    signalsRef.current = signals;
  });

  useLayoutEffect(() => {
    if (!view) return;
    let cancelled = false;
    const settle = renderStarted();
    const start = performance.now();
    try {
      for (const [name, values] of Object.entries(datasets)) {
        view.data(name, values);
      }
      for (const [name, value] of Object.entries(JSON.parse(paramsKey))) {
        view.signal(name, value);
      }
    } catch {
      settle();
      return; // the view was finalized by a concurrent re-embed
    }
    view
      .runAsync()
      .then(() => {
        settle();
        if (cancelled) return;
        requestAnimationFrame(() => {
          if (!cancelled) onRenderedRef.current?.(performance.now() - start);
        });
      })
      .catch(settle);
    return () => {
      cancelled = true;
      settle();
    };
  }, [view, datasets, paramsKey]);

  const signalNames = Object.keys(signals ?? {}).join(",");
  useEffect(() => {
    if (!view || !signalNames) return;
    const listeners = signalNames.split(",").map((name) => {
      const listener = (signal: string, value: unknown) =>
        signalsRef.current?.[signal]?.(signal, value);
      view.addSignalListener(name, listener);
      return [name, listener] as const;
    });
    return () => {
      for (const [name, listener] of listeners) {
        view.removeSignalListener(name, listener);
      }
    };
  }, [view, signalNames]);

  return <div ref={ref} {...divProps} />;
};
