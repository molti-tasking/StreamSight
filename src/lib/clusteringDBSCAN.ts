/**
 * DBSCAN-based clustering function to group data points based on density.
 *
 */
export const clusteringDBSCAN = (
  values: [string, Record<number, number>][],
  eps: number
): [string, Record<number, number>][][] => {
  const clusters: [string, Record<number, number>][][] = [];

  const visited = new Array(values.length).fill(false);
  const clustered = new Array(values.length).fill(false); // Track if a point is already in a cluster

  // Euclidean distance calculation
  const calculateDistance = (
    pointA: [string, Record<number, number>],
    pointB: [string, Record<number, number>]
  ): number => {
    let sum = 0;
    for (const entry in pointA[1]) {
      sum += (pointA[1][Number(entry)] - pointB[1][Number(entry)]) ** 2;
    }
    return Math.sqrt(sum);
  };

  // Find all neighbors within eps distance
  const getNeighbors = (pointIndex: number): number[] => {
    const neighbors: number[] = [];
    for (let i = 0; i < values.length; i++) {
      if (
        i !== pointIndex &&
        calculateDistance(values[pointIndex], values[i]) <= eps
      ) {
        neighbors.push(i);
      }
    }
    return neighbors;
  };

  // Recursive function to expand cluster
  const expandCluster = (
    cluster: [string, Record<number, number>][],
    pointIndex: number,
    neighbors: number[]
  ): void => {
    // Add point to cluster and mark it as clustered
    cluster.push(values[pointIndex]);
    clustered[pointIndex] = true;

    for (let i = 0; i < neighbors.length; i++) {
      const neighborIndex = neighbors[i];

      if (!visited[neighborIndex]) {
        visited[neighborIndex] = true;
        const newNeighbors = getNeighbors(neighborIndex);

        if (newNeighbors.length >= eps) {
          // Use eps as minPoints-like threshold for neighbors
          neighbors.push(...newNeighbors);
        }
      }

      // Add to cluster only if not already in a cluster
      if (!clustered[neighborIndex]) {
        cluster.push(values[neighborIndex]);
        clustered[neighborIndex] = true; // Mark as clustered
      }
    }
  };

  for (let i = 0; i < values.length; i++) {
    if (visited[i] || clustered[i]) continue; // Skip if visited or already in a cluster

    visited[i] = true;
    const neighbors = getNeighbors(i);

    const cluster: [string, Record<number, number>][] = [];
    expandCluster(cluster, i, neighbors);

    // Only add non-empty clusters
    if (cluster.length > 0) clusters.push(cluster);
  }

  return clusters;
};
