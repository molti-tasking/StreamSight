"use server";

import { DataProcessingSettings } from "../../lib/settings/DataProcessingSettings";
import { clusteringData } from "./clusteringData";

export type ClusterView = { timestamp: number; clusters: [string, number][] };

type ClusteringReturn = {
  /**
   * This is a list of cluster distributions for different timestamps looking back to a certain period of time
   */
  clustersInTime: ClusterView[];
};

/**
 * We only consider the dataTicks and the clustering mechanism (DBSCAN or count).
 *
 * @param values A list of multivariate time series entries of type Record<string, number>[] where each record contains a "timestamp" and multiple columns that are the actual time series.
 * @param dimensions Basically the extracted keys of the values and it can be considered the names of the time series, but it is not containing the "timestamp" key itself.
 * @param settings containing parameters that define how the data should be processed and grouped.
 * @returns
 */
export const clusteringOverTime = async (
  rawData: Record<string, number>[],
  dimensions: string[],
  settings: DataProcessingSettings
): Promise<ClusteringReturn> => {
  // First we gonna define the return type. Then we gonna skip the first settings.dataTicks - 1 values in order to build the first cluster based on those. Then we iterate over the full list afterwards
  const returnValues: ClusterView[] = [];

  // ----------------
  // Clustering context window: The amount of data entries that should be taken into consideration for handling the clusters later on.
  // ----------------
  const clusteringContextWindow = !!settings.monitoringPeriod
    ? settings.monitoringPeriod
    : 60 * 60 * 1000; // 1 hour just as a dump fallback value

  for (
    let dataEntryIndex = 0;
    dataEntryIndex < rawData.length;
    dataEntryIndex++
  ) {
    const startTimestamp =
      "timestamp" in rawData[dataEntryIndex]
        ? Number(rawData[dataEntryIndex].timestamp)
        : Date.now();

    const endTimestamp = startTimestamp + clusteringContextWindow;

    const dataToBeClustered = rawData
      .slice(dataEntryIndex)
      .filter((entry) => entry["timestamp"] <= endTimestamp);

    const aggregated = await clusteringData(
      dataToBeClustered,
      dimensions,
      settings
    );

    const clusters: [string, number][] = dimensions.map((val) => [
      val,
      aggregated.findIndex((entries) => Object.keys(entries[0]).includes(val)),
    ]);

    returnValues.push({ timestamp: startTimestamp, clusters });
  }

  return { clustersInTime: returnValues };
};
