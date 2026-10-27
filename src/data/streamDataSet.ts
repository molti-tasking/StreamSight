export type DataSet = "NIRS" | "S&P500" | "GDP";

export type DataSetInfo = {
  label: string;
  description: string;
  url: string;
  /** The file is gzip-compressed JSON (decompressed in the browser). */
  gzip?: boolean;
  /** Companion metadata (units, conversion, reference events). */
  metaUrl?: string;
  /** Time between samples in the source data, in ms. */
  nativeIntervalMs: number;
  /**
   * Time between rows at "native" playback speed, in ms: the sampling
   * interval for real streams; a 1 row/s replay for daily or yearly data.
   */
  playbackIntervalMs: number;
  /** "relative": timestamps are ms since the recording started. */
  timeAxis: "relative" | "absolute";
  /** Whether the data is a real-time stream (GDP is yearly, not streaming). */
  streaming: boolean;
  /** A starting eps for raw (non-normalized) clustering, in data units. */
  rawEps: number;
};

export const dataSets: Record<DataSet, DataSetInfo> = {
  NIRS: {
    label: "NIRS blood oxygenation (case study)",
    description:
      "210 fNIRS channels, oxygenated-haemoglobin change (ΔHbO, µM) at 7.63 Hz over 45.7 minutes, with 9 recorded stimulus markers. De-identified.",
    url: "/data/nirs-session010-hbo.json.gz",
    gzip: true,
    metaUrl: "/data/nirs-session010.meta.json",
    nativeIntervalMs: 131.072,
    playbackIntervalMs: 131.072,
    timeAxis: "relative",
    streaming: true,
    rawEps: 1,
  },
  "S&P500": {
    label: "S&P 500",
    description: "500 parallel time series of S&P 500 stock values on a daily basis.",
    url: "/data/20250228_stock_sp500_data.json",
    nativeIntervalMs: 24 * 3600 * 1000,
    playbackIntervalMs: 1000,
    timeAxis: "absolute",
    streaming: true,
    rawEps: 20,
  },
  GDP: {
    label: "GDP (non-streaming demo)",
    description:
      "212 countries' yearly GDP, 1970–2022. Yearly data is not a real-time stream; included only as a small demo.",
    url: "/data/20250228_un_gdp_data.json",
    nativeIntervalMs: 365 * 24 * 3600 * 1000,
    playbackIntervalMs: 1000,
    timeAxis: "absolute",
    streaming: false,
    rawEps: 100000,
  },
};

export type DataEntry = {
  timestamp: number;
  [x: string]: number | null;
};

export async function fetchDataSet(dataSet: DataSet): Promise<DataEntry[]> {
  const info = dataSets[dataSet];
  const res = await fetch(info.url);
  if (!res.ok || !res.body) throw new Error(`Could not load ${info.url}: ${res.status}`);
  if (!info.gzip) return res.json();
  const text = await new Response(
    res.body.pipeThrough(new DecompressionStream("gzip"))
  ).text();
  return JSON.parse(text);
}
