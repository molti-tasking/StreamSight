"use server";
import { DataProcessingSettings } from "../../lib/settings/DataProcessingSettings";
import { clusteringData } from "./clusteringData";

type AggregatedProps = {
  aggregated: Record<string, number>[][];
  yDomain: [number, number];
  clusterAssignment: [string, number][];
};

/**
 * This function is meant to return a ready-to-visualize data set after receiving the raw data and the configuration of how the data should be transformed. One option is the cluster them by defining a threshold
 *
 * @param values A list of multivariate time series entries of type Record<string, number>[] where each record contains a "timestamp" and multiple columns that are the actual time series.
 * @param dimensions Basically the extracted keys of the values and it can be considered the names of the time series, but it is not containing the "timestamp" key itself.
 * @param settings containing parameters that define how the data should be processed and grouped.
 * @returns
 */
export const aggregator = async (
  rawData: Record<string, number>[],
  dimensions: string[],
  dataProcessingSettings: DataProcessingSettings
): Promise<AggregatedProps> => {
  console.log("Cluster with eps: ", dataProcessingSettings.eps);
  // ----------------
  // Filtering data to time
  // ----------------
  let dataToBeClustered = rawData;
  if (dataProcessingSettings.monitoringPeriod) {
    const latestTimeValue =
      rawData?.[rawData.length - 1]?.["timestamp"] ?? Date.now();

    const minTime = latestTimeValue - dataProcessingSettings.monitoringPeriod;
    dataToBeClustered = rawData.filter(
      (entry) => entry["timestamp"] >= minTime
    );
  }

  // ----------------
  // Clustering data
  // ----------------
  const aggregated: Record<string, number>[][] = await clusteringData(
    dataToBeClustered,
    dimensions,
    dataProcessingSettings
  );

  // ----------------
  // Data wrapping step (currently disabled)
  // This would filter out "boring" data sections with little variation
  // ----------------
  // aggregated = await dataWrappingProcess(aggregated, dataProcessingSettings);

  // ----------------
  // Getting meta data, like all cols and y-domain
  // ----------------

  const clusterAssignment: [string, number][] = dimensions.map((val) => [
    val,
    aggregated.findIndex((entries) =>
      Object.keys(entries[0] ?? []).includes(val)
    ),
  ]);

  // Calculate the shared y-axis domain across all clusters
  const allValues = dataToBeClustered.flatMap((entries) =>
    Object.entries(entries).flatMap(([key, value]) =>
      key === "timestamp" ? [] : [value]
    )
  );

  // Find max values of all to define the sizes of the charts
  let yMin: number = +Infinity;
  let yMax: number = -Infinity;
  for (const value of allValues) {
    if (value < yMin) {
      yMin = value;
    } else if (value > yMax) {
      yMax = value;
    }
  }

  const yDomain: [number, number] = [yMin, yMax];

  return { aggregated, yDomain, clusterAssignment };
};
