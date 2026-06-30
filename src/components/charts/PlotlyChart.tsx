"use client";
import { cn } from "@/lib/utils";
import { Layout } from "plotly.js";

import { ChartProps } from "./ChartProps";
import dynamic from "next/dynamic";
import { useMemo } from "react";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export const PlotlyChart = ({ values, yDomain, className }: ChartProps) => {
  // Rebuilding the trace arrays on every render is the per-chart hot path with
  // 30+ live charts; memoize on the inputs that actually change.
  const data: Plotly.Data[] = useMemo(() => {
    const dimensions = values.length
      ? Object.keys(values[0]).filter((e) => e !== "timestamp")
      : [];
    return dimensions.map((variable) => ({
      x: values.map((d) => new Date(d.timestamp)),
      y: values.map((d) => d[variable]),
      type: "scattergl",
      mode: "lines",
      name: variable,
      hoverinfo: "skip",
    }));
  }, [values]);

  // Define the layout for the Plotly chart
  const layout: Partial<Layout> = useMemo(
    () => ({
      xaxis: {
        title: "Time",
        type: "date",
      },
      yaxis: { title: "Value", range: yDomain },
      legend: {
        title: { text: "Variables" },
      },
      plot_bgcolor: "transparent",
      paper_bgcolor: "transparent",
      autosize: true,
    }),
    [yDomain]
  );

  return (
    <Plot
      data={data}
      layout={layout}
      className={cn(className)}
      config={{
        displaylogo: false,
        // scrollZoom: false,
        // staticPlot: true,
        displayModeBar: false,
      }}
    />
  );
};
