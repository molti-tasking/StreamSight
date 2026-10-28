import { expect, test } from "vitest";
import { decodeViewState, encodeViewState, plain, type ViewState } from "./urlState";

const state: ViewState = {
  source: { kind: "synthetic", config: { seed: 7, nStreams: 80, nTicks: 3600, nClusters: 5, anomalies: 12 } },
  position: 420,
  speed: 2,
  processing: { eps: 0.6, minPts: 2, zNormalize: true, dataTicks: 50 },
  view: { layoutMode: "treemap", chartMode: "highlighted", clusterOrderMode: "stable" },
  range: { from: 1000, to: 5000 },
};

test("view state round-trips through the query string", () => {
  expect(decodeViewState(`?${encodeViewState(state)}`)).toEqual(state);
});

test("missing or malformed state is ignored", () => {
  expect(decodeViewState("")).toBeUndefined();
  expect(decodeViewState("?view=%7Bnot-json")).toBeUndefined();
  expect(decodeViewState(`?view=${encodeURIComponent(JSON.stringify({ v: 2 }))}`)).toBeUndefined();
});

test("plain() drops store actions", () => {
  expect(plain({ eps: 1, update: () => undefined })).toEqual({ eps: 1 });
});
