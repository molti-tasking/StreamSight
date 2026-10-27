"use client";
import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { useRawDataStore } from "@/store/useRawDataStore";
import { useTemporalNavigationStore } from "@/store/useTemporalNavigationStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import { useEffect, useMemo } from "react";
import { VegaLite, type VisualizationSpec } from "react-vega";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

/**
 * Focus + context timeline overview for multi-scale navigation.
 *
 * Shows how many clusters existed at each point across the whole retained
 * buffer (the "context"), and lets the user brush a time range to drive the
 * detail views (the "focus"). Brushed ranges can be bookmarked and revisited —
 * the external-memory aid the formative study asked for.
 */
export const TimelineOverview = () => {
  const values = useRawDataStore((state) => state.values);
  const presentationSettings = useClusterProcessingSettingsStore();
  const clustersInTime = useViewModelStore((state) => state.clustersInTime);
  const processClustersInTimeData = useViewModelStore(
    (state) => state.processClustersInTimeData
  );

  const mode = useTemporalNavigationStore((s) => s.mode);
  const from = useTemporalNavigationStore((s) => s.from);
  const to = useTemporalNavigationStore((s) => s.to);
  const bookmarks = useTemporalNavigationStore((s) => s.bookmarks);
  const setRange = useTemporalNavigationStore((s) => s.setRange);
  const setLatest = useTemporalNavigationStore((s) => s.setLatest);
  const addBookmark = useTemporalNavigationStore((s) => s.addBookmark);
  const removeBookmark = useTemporalNavigationStore((s) => s.removeBookmark);
  const jumpTo = useTemporalNavigationStore((s) => s.jumpTo);

  // The over-time clustering powers the context band.
  useEffect(() => {
    processClustersInTimeData();
  }, [presentationSettings, values, processClustersInTimeData]);

  const data = useMemo(
    () =>
      clustersInTime.map((c) => ({
        timestamp: Number(c.timestamp),
        clusterCount: new Set(
          c.clusters.map(([, id]) => id).filter((id) => id >= 0)
        ).size,
      })),
    [clustersInTime]
  );

  const spec: VisualizationSpec = useMemo(
    () => ({
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      width: "container",
      height: 60,
      background: "transparent",
      autosize: { type: "fit", contains: "padding" },
      layer: [
        {
          data: { values: data },
          params: [{ name: "brush", select: { type: "interval", encodings: ["x"] } }],
          mark: { type: "area", color: "#4682B4", opacity: 0.6, line: true },
          encoding: {
            x: {
              field: "timestamp",
              type: "quantitative",
              scale: { zero: false },
              axis: {
                title: null,
                labelExpr: "timeFormat(datum.value, '%H:%M:%S')",
              },
            },
            y: {
              field: "clusterCount",
              type: "quantitative",
              axis: { title: "clusters", tickMinStep: 1 },
            },
          },
        },
        // Current focus window (if any) as a translucent band.
        ...(mode === "range" && from !== undefined && to !== undefined
          ? [
              {
                data: { values: [{ from, to }] },
                mark: { type: "rect" as const, color: "#FBBF24", opacity: 0.2 },
                encoding: {
                  x: { field: "from", type: "quantitative" as const },
                  x2: { field: "to" },
                },
              },
            ]
          : []),
        // Bookmarks as vertical rules at their range midpoints.
        ...(bookmarks.length
          ? [
              {
                data: {
                  values: bookmarks.map((b) => ({
                    mid: (b.from + b.to) / 2,
                    label: b.label,
                  })),
                },
                mark: {
                  type: "rule" as const,
                  color: "#7C3AED",
                  strokeDash: [2, 2],
                },
                encoding: {
                  x: { field: "mid", type: "quantitative" as const },
                  tooltip: { field: "label", type: "nominal" as const },
                },
              },
            ]
          : []),
      ],
    }),
    [data, mode, from, to, bookmarks]
  );

  return (
    <div className="border-b px-4 py-1">
      <div className="flex flex-row items-center gap-2 mb-1">
        <span className="text-xs font-bold uppercase text-gray-500">
          Timeline
        </span>
        <span className="text-xs text-muted-foreground">
          {mode === "latest" ? "Latest window" : "Custom range"}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs"
          onClick={() => setLatest()}
          disabled={mode === "latest"}
        >
          Reset to latest
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs"
          onClick={() => addBookmark()}
          disabled={mode !== "range"}
        >
          Bookmark range
        </Button>
        <div className="flex flex-row gap-1 overflow-x-auto">
          {bookmarks.map((b) => (
            <span
              key={b.id}
              className={cn(
                "text-xs rounded-full border px-2 py-0.5 flex items-center gap-1",
                "bg-purple-50 border-purple-300"
              )}
            >
              <button onClick={() => jumpTo(b.id)} className="text-purple-700">
                {b.label}
              </button>
              <button
                onClick={() => removeBookmark(b.id)}
                className="text-gray-400 hover:text-red-500"
                aria-label="Remove bookmark"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
      {data.length > 1 ? (
        <VegaLite
          spec={spec}
          actions={false}
          className="w-full"
          signalListeners={{
            brush: (_name, value) => {
              const ext = (value as { timestamp?: [number, number] })?.timestamp;
              if (ext && ext.length === 2) setRange(ext[0], ext[1]);
            },
          }}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          Collecting data for the timeline…
        </p>
      )}
    </div>
  );
};
