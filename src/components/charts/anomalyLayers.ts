import { ANOMALY_COLOR } from "../clusterColors";

export type AnomalyMarker = { timestamp: number; label: string };

/**
 * Vega-Lite layers marking anomalies at their timestamps: a dashed rule over
 * the full height plus a downward triangle at the top (shape, not only
 * colour, distinguishes them from cluster lines), with the auto-generated
 * label as tooltip. The layers bring their own data and inherit only x.
 */
export function anomalyLayers(anomalies: AnomalyMarker[] | undefined) {
  if (!anomalies?.length) return [];
  const data = { values: anomalies.map(({ timestamp, label }) => ({ timestamp, label })) };
  return [
    {
      data,
      mark: { type: "rule" as const, color: ANOMALY_COLOR, strokeDash: [3, 3], opacity: 0.7 },
      encoding: { tooltip: { field: "label", type: "nominal" as const } },
    },
    {
      data,
      mark: {
        type: "point" as const,
        shape: "triangle-down",
        filled: true,
        color: ANOMALY_COLOR,
        size: 50,
        opacity: 0.9,
      },
      encoding: {
        y: { value: 5 },
        tooltip: { field: "label", type: "nominal" as const },
      },
    },
  ];
}
