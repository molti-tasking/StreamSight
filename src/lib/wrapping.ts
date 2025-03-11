import { findCommonElements } from "./findCommonElements";
import { DataProcessingSettings } from "./settings/DataProcessingSettings";

export const dataWrappingProcess = (
  aggregated: Record<string, number>[][],
  settings: DataProcessingSettings
) => {
  const { meanRange, tickRange, ignoreBoringDataMode } = settings;
  if (ignoreBoringDataMode === "standard" && !!meanRange && !!tickRange) {
    // Map all cluster dimensions because we need them later in order to set the values to undefined if needed.
    const clustersDimensions: string[][] = [];
    for (
      let clusterIndex = 0;
      clusterIndex < aggregated.length;
      clusterIndex++
    ) {
      const cluster = aggregated[clusterIndex];
      const dims = Object.keys(cluster[0] || {}).filter(
        (key) => key !== "timestamp"
      );
      clustersDimensions.push(dims);
    }

    // 1. Get unimportant data areas for each cluster
    const allBoringValues = aggregated.map((aggregatedValues, index) =>
      findBoringTimestamps(aggregatedValues, clustersDimensions[index], {
        meanRange,
        tickRange,
      })
    );
    // 2. Get the unimportant data areas that all clusters have in common
    const commonBoringData = findCommonElements(allBoringValues).sort();

    // 3. Set those data points to undefined

    if (commonBoringData.length) {
      // Filter all timestamps upfront for better readability
      const allTimestamps = [];
      for (
        let entryIndex = 0;
        entryIndex < aggregated[0].length;
        entryIndex++
      ) {
        const element = aggregated[0][entryIndex];
        allTimestamps.push(element["timestamp"]);
      }

      const newAggregated: Record<string, number>[][] = [];
      for (
        let clusterIndex = 0;
        clusterIndex < aggregated.length;
        clusterIndex++
      ) {
        newAggregated.push([]); // using this loop to also initialize the new aggregated empty array
      }

      let wasPrevBoring = false;
      // IMPORTANT: We have to know that all aggregated clusters have the same timestamps and also all of them have to be in the same order!
      for (
        let entryIndex = 0;
        entryIndex < allTimestamps.length;
        entryIndex++
      ) {
        const timestamp = allTimestamps[entryIndex];
        const isBoringEntry = commonBoringData.includes(timestamp);

        if (isBoringEntry) {
          // TODO: Make this optional based on the "saveScreenSpace" variable
          // If previous value was also boring, we don't insert even a new value. If prev was not boring, this is just first one being boring so it should be having only nullable values in order to show some "empty space" to the user later on.
          if (wasPrevBoring && settings.saveScreenSpace) {
          } else {
            // Set value undefined for each cluster values
            for (
              let clusterIndex = 0;
              clusterIndex < aggregated.length;
              clusterIndex++
            ) {
              // This has to be defined like this in order to create a new object, rather than just copying the reference.
              const undefinedObject: Record<string, number | undefined> = {
                ...aggregated[clusterIndex][entryIndex],
              };
              const clusterDimensions = clustersDimensions[clusterIndex];
              for (
                let dimensionIndex = 0;
                dimensionIndex < clusterDimensions.length;
                dimensionIndex++
              ) {
                const dimension = clusterDimensions[dimensionIndex];
                undefinedObject[dimension] = undefined;
              }

              newAggregated[clusterIndex].push(
                undefinedObject as Record<string, number>
              );
            }
          }
          wasPrevBoring = true;
        } else {
          for (
            let clusterIndex = 0;
            clusterIndex < aggregated.length;
            clusterIndex++
          ) {
            // Value is not boring, it is significant so we add to new aggregated values
            newAggregated[clusterIndex].push(
              aggregated[clusterIndex][entryIndex]
            );
          }
          wasPrevBoring = false;
        }
      }

      return newAggregated;
    }
  }
  return aggregated;
};

export type DataCompressionPreferences = {
  /**
   * This value is a threshold. Whenever one of the values of a given range is outside of the a relative range apart from the mean, it will be considered as significant. Should be a number between 0 and 1.
   *
   */
  meanRange: number;
  /**
   * Ticks to be taken into account for the check if there is a relevant threshold. Should be at least 3.
   * @default 3
   */
  tickRange: number;
};

export const wrapper = (
  rawData: Record<string, number>[],
  dimensions: string[],
  settings: DataCompressionPreferences
) => {
  console.count("Called wrapper");
  const totalTickRange = Math.floor(settings.tickRange) ?? 3;
  const ticksBefore = Math.floor((totalTickRange - 1) / 2);
  const ticksAfter = totalTickRange - ticksBefore;

  const filteredData = [];
  for (let entryIndex = 0; entryIndex < rawData.length; entryIndex++) {
    if (
      entryIndex <= ticksBefore - 1 ||
      entryIndex > rawData.length - ticksAfter
    ) {
      const entry = rawData[entryIndex];
      filteredData.push(entry);
    } else {
      const currentSection = rawData.slice(
        entryIndex - ticksBefore,
        entryIndex + ticksAfter
      );

      let shouldSetValueToUndefined = true;
      for (
        let dimensionIndex = 0;
        dimensionIndex < dimensions.length;
        dimensionIndex++
      ) {
        const dimension = dimensions[dimensionIndex];

        const relativeRange = calculateRelativeRangeB(
          ...currentSection.map((e) => e[dimension])
        );
        if (settings.meanRange > relativeRange) {
        } else {
          shouldSetValueToUndefined = false;
          break;
        }
      }

      const currentEntry = rawData[entryIndex];
      if (shouldSetValueToUndefined) {
        // This has to be defined like this in order to create a new object, rather than just copying the reference.
        const undefinedObject: Record<string, number | undefined> = {
          ...currentEntry,
        };
        for (
          let dimensionIndex = 0;
          dimensionIndex < dimensions.length;
          dimensionIndex++
        ) {
          const dimension = dimensions[dimensionIndex];
          undefinedObject[dimension] = undefined;
        }

        filteredData.push(undefinedObject);
      } else {
        filteredData.push(currentEntry);
      }
    }
  }

  return { filteredData };
};

export const findBoringTimestamps = (
  rawData: Record<string, number>[],
  dimensions: string[],
  settings: DataCompressionPreferences
): number[] => {
  // Pretty much do same thing, but whenever we find a value that is "boring", we put its timestamp and index into an array and return it.

  const totalTickRange = Math.floor(settings.tickRange) ?? 3;
  const ticksBefore = Math.floor((totalTickRange - 1) / 2);
  const ticksAfter = totalTickRange - ticksBefore;

  const boringEntries: number[] = [];
  for (let entryIndex = 0; entryIndex < rawData.length; entryIndex++) {
    if (
      entryIndex <= ticksBefore - 1 ||
      entryIndex > rawData.length - ticksAfter
    ) {
    } else {
      const currentSection = rawData.slice(
        entryIndex - ticksBefore,
        entryIndex + ticksAfter
      );

      let isBoringValue = true;
      for (
        let dimensionIndex = 0;
        dimensionIndex < dimensions.length;
        dimensionIndex++
      ) {
        const dimension = dimensions[dimensionIndex];

        const relativeRange = calculateRelativeRangeB(
          ...currentSection.map((e) => e[dimension])
        );
        if (settings.meanRange > relativeRange) {
        } else {
          isBoringValue = false;
          break;
        }
      }

      const currentEntry = rawData[entryIndex];
      if (isBoringValue) {
        // This has to be defined like this in order to create a new object, rather than just copying the reference.
        boringEntries.push(currentEntry["timestamp"]);
      }
    }
  }

  return boringEntries;
};

export const calculateRelativeRangeA = (...numbers: number[]) => {
  // Calculate the mean
  const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;

  // Find minimum and maximum
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);

  // Calculate the absolute range
  const absoluteRange = max - min;

  // Calculate the absolute range relative to the mean
  return absoluteRange / mean;
};
export const calculateRelativeRangeB = (...numbers: number[]) => {
  // Initialize variables for sum, min, and max
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;

  // Single pass to compute sum, min, and max
  for (const num of numbers) {
    sum += num;
    if (num < min) min = num;
    if (num > max) max = num;
  }

  // Calculate the mean
  const mean = sum / numbers.length;

  // Calculate the absolute range
  const absoluteRange = max - min;

  // Calculate the absolute range relative to the mean
  return absoluteRange / mean;
};
