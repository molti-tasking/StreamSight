"use client";
import { useRawDataStore } from "@/store/useRawDataStore";
import dynamic from "next/dynamic";
import React, { useEffect, useRef } from "react";
import { ViewListener, type VisualizationSpec } from "react-vega";
const VegaLite = dynamic(() => import("react-vega").then((m) => m.VegaLite), {
  ssr: false,
});

export const VegaLiteChartBaselineSelection = React.memo(
  ({ onSelect }: { onSelect: (date: string | number) => void }) => {
    // Use a ref to hold the store values without causing re-renders.
    const storeValuesRef = useRef(useRawDataStore.getState().values);

    useEffect(() => {
      // Subscribe to store changes imperatively.
      const unsubscribe = useRawDataStore.subscribe((state) => {
        storeValuesRef.current = state.values;
      });
      return unsubscribe;
    }, []);

    const values = storeValuesRef.current;

    const dimensions = values.length
      ? Object.keys(values[0]).filter((e) => e !== "timestamp")
      : [];

    const handleNewView: ViewListener = (view) => {
      view.addSignalListener("clicked", (_, value) => {
        if (value && value.timestamp && value.timestamp?.[0]) {
          const timestamp = value.timestamp[0];
          console.log("Clicked timestamp: ", timestamp);
          onSelect(timestamp);
        }
      });
    };

    const spec: VisualizationSpec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      width: "container",
      height: "container",
      background: "transparent",

      padding: 0,
      // Try to ensure it resizes to fill container space without extra padding
      autosize: {
        type: "fit",
        contains: "padding",
      },

      data: { values },
      transform: [{ fold: dimensions, as: ["variable", "value"] }],

      encoding: {
        x: { field: "timestamp", type: "temporal", axis: {}, title: null },
      },
      layer: [
        {
          mark: "line",
          encoding: {
            y: {
              field: "value",
              type: "quantitative",

              title: null,
              axis: {
                labelPadding: -20,
                labelOpacity: 0.5,
                ticks: false,
                domain: false,
              },
            },
            color: {
              field: "variable",
              type: "nominal",
              title: "Variables",
              legend: null,
            },
          },
        },
        {
          params: [
            {
              name: "index",
              select: {
                type: "point",
                encodings: ["x"],
                on: "pointermove",
                nearest: true,
              },
            },
            {
              name: "clicked",
              select: {
                type: "point",
                encodings: ["x"],
                on: "click",
                nearest: true,
              },
            },
          ],
          mark: { type: "point" },
          encoding: {
            y: { field: "value", type: "quantitative" },
            opacity: { value: 0 },
          },
        },
        {
          transform: [{ filter: { param: "index" } }],
          mark: "rule",
          encoding: {
            x: { field: "timestamp", type: "temporal" },
          },
        },
        {
          transform: [
            { filter: { param: "index" } },
            {
              calculate: "timeFormat(datum.timestamp, '%Y-%m-%d %H:%M:%S')",
              as: "timestampLabel",
            },
          ],
          mark: "text",
          encoding: {
            x: { field: "timestamp", type: "temporal" },
            y: { value: 10 },
            text: { field: "timestampLabel", type: "nominal" },
          },
        },
      ],
      config: { text: { align: "right", dx: -5, dy: 5 } },
    };

    return (
      <VegaLite
        onNewView={handleNewView}
        spec={spec}
        actions={false}
        style={{ cursor: "pointer" }}
        className={"rounded-sm overflow-hidden w-full h-72 cursor-pointer"}
      />
    );
  },
  () => true
);

VegaLiteChartBaselineSelection.displayName = "VegaLiteChartBaselineSelection";
