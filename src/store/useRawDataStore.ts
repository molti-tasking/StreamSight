import { DataSet, streamDataSet } from "@/data/streamDataSet";
import { create } from "zustand";

interface DataStore {
  mode: "random" | "peaks";
  dimensions: string[];
  values: Record<string, number>[];
  streamingInterval: number | null;
  intervalId: NodeJS.Timeout | null;

  loadDataset: (dataset: DataSet) => void;

  updateData: (
    mode: "random" | "peaks",
    columnCount: number,
    rowCount: number,
    streamingInterval?: number
  ) => void;
}

export const useRawDataStore = create<DataStore>((set, get) => {
  return {
    mode: "peaks",
    dimensions: [],
    values: [],
    streamingInterval: null,
    intervalId: null,

    loadDataset: async (dataset: DataSet) => {
      const { intervalId } = get();

      if (intervalId) clearInterval(intervalId);

      console.log("Load dataset: ", dataset);

      set({ values: [], dimensions: [] });
      console.log("Resetted values and dimensions.");

      const dataEntries = streamDataSet(dataset);

      for await (const dataEntry of dataEntries) {
        console.log("Yielded next entry of the data timeline: ", dataEntry);

        const { values: prevValues, dimensions } = get();
        const newValues = [...(prevValues as any[]), dataEntry];
        console.log("New values length: ", newValues.length);

        set({ values: newValues });

        if (!dimensions.length) {
          console.log("No dimensions set, set new values here.");
          const newDimensions = Object.keys(dataEntry).filter(
            (col) => col !== "timestamp"
          );

          console.log("New dimensions length: ", newDimensions.length);
          set({ dimensions: newDimensions });
        }
      }
      set({
        streamingInterval: null,
        intervalId: null,
      });
    },

    updateData: (mode, columnCount, rowCount, streamingInterval) => {
      const { intervalId } = get();
      if (intervalId) clearInterval(intervalId);
      set({ mode, streamingInterval, values: [], dimensions: [] });
      generateData(columnCount, rowCount);
      if (streamingInterval) {
        const newIntervalId = setInterval(() => {
          console.log("Stream update");
          streamDataUpdate();
        }, streamingInterval);
        set({ intervalId: newIntervalId });
      }
    },
  };
});

// ----------------
// DATA GENERATION
// ----------------

const generateData = (columns: number, rows: number, min = 5, max = 10) => {
  const mode = useRawDataStore.getState().mode;
  const newColumns = [
    "timestamp",
    ...Array.from({ length: columns - 1 }, (_, index) => `Col ${index + 1}`),
  ];
  let newData: number[][] = [];
  if (mode === "random") {
    newData = generateRandomTestData(columns, rows, min, max);
  } else if (mode === "peaks") {
    newData = generatePeakTestData(columns, rows, min, max);
  }

  const values = newData.map((row) =>
    newColumns.reduce(
      (prev, curr, i) => ({ ...prev, [curr]: row[i] }),
      {} as Record<string, number>
    )
  );
  useRawDataStore.setState({
    values,
    dimensions: newColumns.filter((col) => col !== "timestamp"),
  });
};

const streamDataUpdate = () => {
  const { values, mode } = useRawDataStore.getState();
  const lastRow = values[values.length - 1];

  if (!lastRow) return;

  const newRow: Record<string, number> = {
    timestamp: lastRow.timestamp + 1000 + (Math.random() - 0.5) * 200,
  };

  if (mode === "random") {
    Object.keys(lastRow).forEach((key) => {
      if (key !== "timestamp") {
        const prevValue = lastRow[key];

        newRow[key] = getRandomNextValue(prevValue);
      }
    });
  } else if (mode === "peaks") {
    const lastRowWithoutTimestamp = Object.entries(lastRow).filter(
      ([key]) => key !== "timestamp"
    );
    const prevValues = lastRowWithoutTimestamp.map(([, v]) => v);
    const newValues = generateNextPeakTestData(prevValues);
    lastRowWithoutTimestamp.forEach(([key], indx) => {
      newRow[key] = newValues[indx];
    });
  }

  // Add new row to values
  useRawDataStore.setState((state) => ({
    values: [...state.values, newRow],
  }));
};

// Helper functions
const getRandomNextValue = (prev: number) => {
  return Math.random() > 0.5
    ? prev * (1 + Math.random() * Math.random() * 0.3)
    : prev *
        (1 - Math.random() * Math.random() * Math.random() * Math.random());
};

const generateRandomTestData = (
  columnsCount: number,
  rowsCount: number,
  min: number,
  max: number
) => {
  const startTime = Date.now();
  return Array.from<number[][]>({ length: rowsCount }).reduce((prev, _, i) => {
    const timestamp = startTime + i * 1000;
    const randomValues =
      i > 0
        ? prev[i - 1].slice(1).map(getRandomNextValue)
        : Array.from(
            { length: columnsCount },
            () => Math.random() * (max - min) + min
          );
    const row = [timestamp, ...randomValues];
    return [...prev, row];
  }, [] as number[][]);
};

let peakActive = false;
let peakDecayCounter = 0;
let peakDuration = 0;
let baselineValues: number[] = [];

const generateNextPeakTestData = (
  /**
   * Array of previous value, it should not include a timestamp
   */
  previousValues: number[]
) => {
  let randomValues: number[];

  if (peakActive) {
    if (peakDecayCounter > 0) {
      randomValues = previousValues.map(
        (value, index) =>
          value - (value - baselineValues[index]) * (0.2 + Math.random() * 0.1)
      );

      peakDecayCounter--;
      if (peakDecayCounter === 0) peakActive = false;
    } else {
      randomValues = previousValues.map(
        (value) => value * (1 + Math.random() * 0.2)
      );

      peakDecayCounter = peakDuration;
    }
  } else {
    randomValues = previousValues.map((value, index) => {
      baselineValues[index] += (Math.random() - 0.5) * 0.02;
      return value * (1 + (Math.random() - 0.5) * 0.03);
    });

    if (Math.random() < 0.05) {
      peakActive = true;
      peakDuration = Math.floor(2 + Math.random() * 5);
      randomValues = previousValues.map(
        (value) => value * (1 + Math.random() * Math.random() * 0.5)
      );
    }
  }

  return randomValues;
};

/**
 * Generating initial values that all peak regularly. They have different "levels" in a way that their average values increase in bunches
 */
const generatePeakTestData = (
  columnsCount: number,
  rowsCount: number,
  min: number,
  max: number
): number[][] => {
  const startTime = Date.now();

  const jumpStep = 5; // Jump step, how much the range jumps
  const jumpInterval = 10; // Jump interval (every 10 values, range increases by jumpStep)

  peakActive = false;
  peakDecayCounter = 0;
  peakDuration = 0;
  baselineValues = [];
  return Array.from<number[][]>({ length: rowsCount }).reduce((prev, _, i) => {
    const timestamp = startTime + i * 1000 + (Math.random() - 0.5) * 200;
    let randomValues: number[] = [];
    if (i === 0) {
      let currentMin = min;
      let currentMax = max;

      for (let i = 0; i < columnsCount; i++) {
        // Generate a random value in the current range
        const randomValue =
          Math.random() * (currentMax - currentMin) + currentMin;
        randomValues.push(randomValue);

        // Slightly increase the range for the next value
        currentMin += 0.05; // Increment the minimum slightly
        currentMax += 0.05; // Increment the maximum slightly

        // Every jumpInterval values, make a larger jump
        if ((i + 1) % jumpInterval === 0) {
          currentMin += jumpStep;
          currentMax += jumpStep;
        }
      }

      baselineValues = randomValues.slice();
    } else {
      randomValues = generateNextPeakTestData(prev[i - 1].slice(1));
    }
    return [...prev, [timestamp, ...randomValues]];
  }, [] as number[][]);
};
