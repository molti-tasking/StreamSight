import { cn } from "@/lib/utils";
import { Layout } from "plotly.js";
import Plot from "react-plotly.js";
import { ChartProps } from "./ChartProps";

export const PlotlyChart = ({ values, yDomain, className }: ChartProps) => {
  const dimensions = values.length
    ? Object.keys(values[0]).filter((e) => e !== "timestamp")
    : [];

  const data: Plotly.Data[] = dimensions.map((variable) => ({
    x: values.map((d) => new Date(d.timestamp)),
    y: values.map((d) => d[variable]),
    type: "scattergl",
    mode: "lines",
    name: variable,
    hoverinfo: "skip",
  }));

  // Define the layout for the Plotly chart
  const layout: Partial<Layout> = {
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
  };

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
