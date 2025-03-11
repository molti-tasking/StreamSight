import { clusteringData } from "./clusteringData";
import { DataProcessingSettings } from "./settings/DataProcessingSettings";

export type ClusterView = { timestamp: string; clusters: [string, number][] };

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
export const clusteringOverTime = (
  rawData: Record<string, number>[],
  dimensions: string[],
  settings: DataProcessingSettings
): ClusteringReturn => {
  // First we gonna define the return type. Then we gonna skip the first settings.dataTicks - 1 values in order to build the first cluster based on those. Then we iterate over the full list afterwards
  const returnValues: ClusterView[] = [];

  // ----------------
  // Clustering context window: The amount of data entries that should be taken into consideration for handling the clusters later on.
  // ----------------
  const clusteringContextWindow = !!settings.dataTicks
    ? settings.dataTicks
    : 20; // 20 just as a dump fallback value

  for (
    let dataEntryIndex = 0;
    dataEntryIndex < rawData.length;
    dataEntryIndex++
  ) {
    /**
     * We use a "slice", which excludes the last item of the list. So we have to add 1 the the end index as we only iterate within the list.
     */
    const endIndex = dataEntryIndex + 1;
    /**
     * This is the first value that should be taken into consideration for clustering.
     */
    const startIndex = endIndex - clusteringContextWindow;
    if (startIndex < 0) {
      // Skip all values below the context window size.
      continue;
    }

    const dataToBeClustered = rawData.slice(startIndex, endIndex);

    const timestamp =
      "timestamp" in rawData[dataEntryIndex]
        ? String(rawData[dataEntryIndex].timestamp)
        : "";

    const aggregated = clusteringData(dataToBeClustered, dimensions, settings);

    const clusters: [string, number][] = dimensions.map((val) => [
      val,
      aggregated.findIndex((entries) => Object.keys(entries[0]).includes(val)),
    ]);

    returnValues.push({ timestamp, clusters });
  }

  return { clustersInTime: returnValues };
};
