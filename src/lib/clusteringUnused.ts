import { DataProcessingSettings } from "./settings/DataProcessingSettings";

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
 * @deprecated This is not used because it's to slow
 */
export const aggregatorUnused = (
  rawData: Record<string, number>[],
  dimensions: string[],
  settings: DataProcessingSettings
): AggregatedProps => {
  console.count("Called aggregator");
  let dataToBeClustered = rawData;
  if (settings.dataTicks) {
    dataToBeClustered = rawData.slice(-1 * settings.dataTicks);
  }

  let aggregated: Record<string, number>[][] = [dataToBeClustered];
  if ("eps" in settings && !!settings.eps) {
    // Here we are first putting all the different entries that are grouped by timestamp into another representation which is grouped by column. This way it will be easier to calculate a distance between those later on.
    const allTimeSeries: [string, Record<number, number>][] = dimensions.map(
      (dimension) => {
        const timeSeries = dataToBeClustered.reduce(
          (prev, curr) => ({ ...prev, [curr.timestamp]: curr[dimension] }),
          {}
        );
        return [dimension, timeSeries];
      }
    );

    // We let the clustering algorithm do the magic and return us the clusters.
    const clusters: [string, Record<number, number>][][] = clusteringDBSCAN(
      allTimeSeries,
      settings.eps
    );
    const timelineNames = clusters.flatMap((entry) =>
      entry.flatMap(([entry]) => entry)
    );

    if (timelineNames.length !== dimensions.length) {
      alert("Somehow we have missing timelines");
    }

    // We have to bring these column grouped clusters now again in the structure that they are grouped by column. This way they are required in order to be displayed properly
    aggregated = clusters.map((cluster) => {
      const timestamps = Object.keys(cluster[0][1]);
      return timestamps.map((timestamp) => {
        return cluster.reduce(
          (prev, [colName, values]) => ({
            ...prev,
            [colName]: values[Number(timestamp)],
          }),
          {
            timestamp: Number(timestamp),
          }
        );
      });
    });
  }

  if (
    settings.ignoreBoringDataMode === "standard" &&
    "meanRange" in settings &&
    !!settings.meanRange &&
    "tickRange" in settings &&
    !!settings.tickRange
  ) {
    // TODO Here start the cluster wrapping
    // ----------------
    // Starting the wrapping of unneeded data now after we clustered it.
    // ----------------
    // 1. Get unimportant data areas for each cluster
    // 2. Get the unimportant data areas that all clusters have in common
    // 3. Set those data points to undefined
  }

  const clusterAssignment: [string, number][] = dimensions.map((val) => [
    val,
    aggregated.findIndex((entries) => Object.keys(entries[0]).includes(val)),
  ]);

  // Calculate the shared y-axis domain across all clusters
  const allValues = dataToBeClustered.flatMap((entries) =>
    Object.entries(entries).flatMap(([key, value]) =>
      key === "timestamp" ? [] : [value]
    )
  );
  const yMin = Math.min(...allValues);
  const yMax = Math.max(...allValues);
  const yDomain: [number, number] = [yMin, yMax];

  return { aggregated, yDomain, clusterAssignment };
};

/**
 *
 * @param values Each record in the list has a "timestamp" value and further values.
 * @param groups The length of the return array.
 * @returns A list of list of records. Each record should have again the timestamp value but the further values should be distributed evenly across the list of records.
 */
const clustering = (
  values: Record<string, number>[],
  groups: number
): Record<string, number>[][] => {
  // Prepare the result array with the specified number of groups.
  const res: Record<string, number>[][] = Array.from(
    { length: groups },
    () => []
  );

  // Extract all column names except for 'timestamp'.
  const allColumns = Object.keys(values[0] || {}).filter(
    (key) => key !== "timestamp"
  );

  // Get the last record (we assume the records are sorted by timestamp).
  const lastRecord = values[values.length - 1];

  // Sort the columns by their values in the last record in descending order.
  const sortedColumns = allColumns.sort(
    (a, b) => lastRecord[b] - lastRecord[a]
  );

  // Calculate how many columns per group (distribute as evenly as possible).
  const columnsPerGroup = Math.ceil(sortedColumns.length / groups);

  // Create the column groups based on the sorted order.
  const columnGroups = Array.from({ length: groups }, (_, i) =>
    sortedColumns.slice(i * columnsPerGroup, (i + 1) * columnsPerGroup)
  );

  // Iterate over each record and split into groups based on the column groups.
  values.forEach((record) => {
    columnGroups.forEach((columns, groupIndex) => {
      // Create a new record for the group containing the timestamp and the selected columns.
      const groupRecord: Record<string, number> = {
        timestamp: record.timestamp,
      };
      columns.forEach((col) => {
        if (col in record) {
          groupRecord[col] = record[col];
        }
      });
      // Push the grouped record into the respective group.
      res[groupIndex].push(groupRecord);
    });
  });

  return res;
};

/**
 * DBSCAN-based clustering function to group data points based on density.
 *
 */
const clusteringDBSCAN = (
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

/**
 * We have to bring these column-grouped clusters now again in the structure that they are grouped by timestamp. This way they are required in order to be displayed properly
 *
 * @param clusters grouped by column clusters
 * @returns
 */
export const regroupClustersA = (
  clusters: [string, Record<number, number>][][]
): Record<string, number>[][] => {
  return clusters.map((cluster) => {
    const timestamps = Object.keys(cluster[0][1]);
    return timestamps.map((timestamp) => {
      return cluster.reduce(
        (prev, [colName, values]) => ({
          ...prev,
          [colName]: values[Number(timestamp)],
        }),
        {
          timestamp: Number(timestamp),
        }
      );
    });
  });
};

export const regroupClustersB = (
  clusters: [string, Record<number, number>][][]
): Record<string, number>[][] => {
  return clusters.map((cluster) => {
    const timestamps = Object.keys(cluster[0][1]);
    return timestamps.map((timestamp) => {
      return cluster.reduce(
        (prev, [colName, values]) => ({
          ...prev,
          [colName]: values[Number(timestamp)],
        }),
        {
          timestamp: Number(timestamp),
        }
      );
    });
  });
};
