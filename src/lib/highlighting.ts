/**
 * This function is meant to find out which cluster members are new in order to be highlighted. The newer they are, the more they are getting highlighted.
 *
 * @returns a list of information on which dimensions should be highlighted with opacity, already sorted by clusters.
 */
export const highlighter = (
  aggregated: Record<string, number>[][],
  clusterAssignment: [string, number][],
  clusterAssignmentHistory: {
    timestamp: number;
    entries: [string, number][];
  }[]
): {
  dimension: string;
  opacity: number;
  lastDimension: number | undefined;
}[][] => {
  const aggregatedHighlightInfo: {
    dimension: string;
    opacity: number;
    lastDimension: number | undefined;
  }[][] = [];

  for (let clusterIndex = 0; clusterIndex < aggregated.length; clusterIndex++) {
    const cluster = aggregated[clusterIndex];

    const dimensions: string[] = cluster.length
      ? Object.keys(cluster[0]).filter((e) => e !== "timestamp")
      : [];

    // Now we want to find out, which columns of the current cluster changed in the past.
    // We want to find out a certain opacity indicating the "difference" of that value.
    // We can do it by checking each time series and compare it like this:
    // 1. Get current cluster.
    // 2. Check for how many of the past clusters it had a different cluster.
    // 3. The more different clusters it has, the higher the opacity.

    const timeSeriesToBeHighlighted: {
      dimension: string;
      opacity: number;
      lastDimension: number | undefined;
    }[] = [];

    for (let dimIndex = 0; dimIndex < dimensions.length; dimIndex++) {
      const dimension = dimensions[dimIndex];
      const currentCluster = clusterAssignment.find(
        ([currDim]) => dimension === currDim
      )?.[1];

      let differentClustersInPast = 0;
      let lastDimension: number | undefined = undefined;
      for (
        let clusterIndex = 0;
        clusterIndex < clusterAssignmentHistory.length;
        clusterIndex++
      ) {
        const pastClusterAssignment = clusterAssignmentHistory[clusterIndex];
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
