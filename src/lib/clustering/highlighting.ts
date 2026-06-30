import { ClusterRow } from "./clusterTypes";

export type HighlightInfo = {
  dimension: string;
  opacity: number;
  lastDimension: number | undefined;
};

/**
 * Pure port of the former `highlighter` server action. Determines which cluster
 * members are "new" (recently changed cluster) so they can be highlighted; the
 * more often a dimension changed cluster in the recent history, the higher its
 * opacity. Pure computation, so it runs on the client without a round-trip.
 */
export const highlighter = (
  aggregated: ClusterRow[][],
  clusterAssignment: [string, number][],
  clusterAssignmentHistory: {
    timestamp: number;
    entries: [string, number][];
  }[]
): HighlightInfo[][] => {
  const aggregatedHighlightInfo: HighlightInfo[][] = [];

  for (let clusterIndex = 0; clusterIndex < aggregated.length; clusterIndex++) {
    const cluster = aggregated[clusterIndex];

    const dimensions: string[] = cluster.length
      ? Object.keys(cluster[0]).filter((e) => e !== "timestamp")
      : [];

    const timeSeriesToBeHighlighted: HighlightInfo[] = [];

    for (let dimIndex = 0; dimIndex < dimensions.length; dimIndex++) {
      const dimension = dimensions[dimIndex];
      const currentCluster = clusterAssignment.find(
        ([currDim]) => dimension === currDim
      )?.[1];

      let differentClustersInPast = 0;
      let lastDimension: number | undefined = undefined;
      for (
        let historyIndex = 0;
        historyIndex < clusterAssignmentHistory.length;
        historyIndex++
      ) {
        const pastClusterAssignment = clusterAssignmentHistory[historyIndex];
        const pastCluster = pastClusterAssignment.entries.find(
          ([currDim]) => dimension === currDim
        )?.[1];

        const isSameCluster = currentCluster === pastCluster;
        if (!isSameCluster) {
          differentClustersInPast = differentClustersInPast + 1;
          if (!lastDimension) {
            lastDimension = pastCluster;
          }
        }
      }

      if (differentClustersInPast > 0) {
        const opacity =
          differentClustersInPast / clusterAssignmentHistory.length;
        timeSeriesToBeHighlighted.push({ dimension, opacity, lastDimension });
      }
    }

    aggregatedHighlightInfo.push(timeSeriesToBeHighlighted);
  }

  return aggregatedHighlightInfo;
};
