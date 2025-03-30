"use server";
import { DataProcessingSettings } from "../../lib/settings/DataProcessingSettings";
import { clusteringDBSCAN } from "./clusteringDBSCAN";

export const clusteringData = async (
  dataToBeClustered: Record<string, number>[],
  dimensions: string[],
  settings: DataProcessingSettings
) => {
  // ----------------
  // Clustering data
  // ----------------

  if (
    settings.clusteringMode === "automatic" &&
    "eps" in settings &&
    !!settings.eps
  ) {
    // Here we are first putting all the different entries that are grouped by timestamp into another representation which is grouped by column. This way it will be easier to calculate a distance between those later on.
    // Convert entries grouped by timestamp into a representation grouped by column for easier distance calculation
    const allTimeSeries: [string, Record<number, number>][] = dimensions.map(
      (dimension) => {
        const timeSeries: Record<number, number> = {};

        for (let i = 0; i < dataToBeClustered.length; i++) {
          const curr = dataToBeClustered[i];
          timeSeries[curr.timestamp] = curr[dimension];
        }

        return [dimension, timeSeries];
      }
    );

    // We let the clustering algorithm do the magic and return us the clusters.
    const clusters: [string, Record<number, number>][][] =
      await clusteringDBSCAN(allTimeSeries, settings.eps);

    const timelineNameCount = clusters.reduce(
      (prev, curr) => prev + curr.length,
      0
    );

    if (timelineNameCount !== dimensions.length) {
      alert("Somehow we have missing timelines");
    }

    // We have to bring these column grouped clusters now again in the structure that they are grouped by column. This way they are required in order to be displayed properly
    return clusters.map((cluster) => {
      const timestamps = Object.keys(cluster[0][1]);
      const result = [];

      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = Number(timestamps[i]);
        const entry: Record<string, number> = { timestamp };

        for (let j = 0; j < cluster.length; j++) {
          const [colName, values] = cluster[j];
          entry[colName] = values[timestamp];
        }

        result.push(entry);
      }

      return result;
    });
  } else if (
    settings.clusteringMode === "manual" &&
    !!Object.entries(settings.manualClusterAssignments).length
  ) {
    console.warn("TODO: Implement manual cluster assignments");
  }

  return [dataToBeClustered];
};
