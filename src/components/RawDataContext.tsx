import { createContext, useContext, useEffect, useState } from "react";

interface RawDataContextTypes {
  /**
   * Depending on the values the random data generation should be of different nature:
   * - random: completely random values
   * - peaks: in irregular intervals all the values should go up for a few rows. Before and afterwards the data should be quite calm with minor changes only.
   */
  mode: "random" | "peaks";
  setMode: (mode: RawDataContextTypes["mode"]) => void;
  dimensions: string[];
  values: Record<string, number>[];
  streamingInterval: null | number;
  setStreamingInterval: (interval: null | number) => void;
  setData: (newData: number[][]) => void;
  generateData: (
    rows: number,
    columns: number,
    min?: number,
    max?: number
  ) => void;
}

const RawDataContext = createContext<RawDataContextTypes>({
  mode: "random",
  dimensions: [],
  values: [],
  streamingInterval: null,
  setMode: () => alert("Context not implemented."),
  setStreamingInterval: () => alert("Context not implemented."),
  setData: () => alert("Context not implemented."),
  generateData: () => alert("Context not implemented."),
});

export const RawDataContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [mode, setMode] = useState<RawDataContextTypes["mode"]>("random");
  const [streamingInterval, setStreamingInterval] = useState<null | number>(
    null
  );
  const [columns, setColumns] = useState<string[]>([]);
  const [data, setData] = useState<number[][]>([]);

  const generateData = (
    rowsCount: number,
    columnsCount: number,
    min: number = 5,
    max: number = 10
  ) => {
    const newColumns = [
      "timestamp",
      ...Array.from(
        { length: columnsCount - 1 },
        (_, index) => `Col ${index + 1}`
      ),
    ];
    setColumns(newColumns);

    let newData: number[][] = [];
    if (mode === "random") {
      newData = generateRandomTestData(rowsCount, columnsCount, min, max);
    } else if (mode === "peaks") {
      newData = generatePeakTestData(rowsCount, columnsCount, min, max);
    }

    setData(newData);
  };

  useEffect(() => {
    if (!data.length) {
      generateData(200, 20);
    }
  }, []);

  useEffect(() => {
    if (streamingInterval === null) return;

    const intervalId = setInterval(() => {
      setData((prevData) => {
        const lastRow = prevData[prevData.length - 1];
        const newTimestamp = lastRow[0] + 1000; // Increment timestamp by 1000ms (1 second)
        const newValues = lastRow
          .slice(1) // Exclude timestamp for value calculations
          .map((value) =>
            Math.random() > 0.5
              ? value * (1 + Math.random() * Math.random() * 0.3)
              : value *
                (1 -
                  Math.random() * Math.random() * Math.random() * Math.random())
          );

        return [...prevData, [newTimestamp, ...newValues]];
      });
    }, streamingInterval);

    return () => clearInterval(intervalId);
  }, [streamingInterval]);

  const dimensions = columns.filter((col) => col !== "timestamp");
  const values = data.map((row) =>
    columns.reduce(
      (prev, curr, i) => ({ ...prev, [curr]: row[i] }),
      {} as Record<string, number>
    )
  );

  return (
    <RawDataContext.Provider
      value={{
        mode,
        setMode,
        dimensions,
        values,
        setData,
        generateData,
        streamingInterval,
        setStreamingInterval,
      }}
    >
      {children}
    </RawDataContext.Provider>
  );
};

export const useDataContext = () => useContext(RawDataContext);

const getRandomNextValue = (prev: number) => {
  return Math.random() > 0.5
    ? prev * (1 + Math.random() * Math.random() * 0.3)
    : prev *
        (1 - Math.random() * Math.random() * Math.random() * Math.random());
};

const generateRandomTestData = (
  rowsCount: number,
  columnsCount: number,
  max: number,
  min: number
) => {
  const startTime = Date.now();

  return Array.from<number[][]>({ length: rowsCount }).reduce((prev, _, i) => {
    const timestamp = startTime + i * 1000;
    const randomValues: number[] =
      i > 0
        ? prev[i - 1].slice(1).map(getRandomNextValue)
        : Array.from(
            { length: columnsCount - 1 },
            () => Math.random() * (max - min) + min
          );

    const row = [timestamp, ...randomValues];
    return [...prev, row];
  }, [] as number[][]);
};

const generatePeakTestData = (
  rowsCount: number,
  columnsCount: number,
  max: number,
  min: number
) => {
  const startTime = Date.now();

  let peakActive = false;
  let peakDecayCounter = 0;
  let peakDuration = 0;
  let baselineValues: number[] = [];

  return Array.from<number[][]>({ length: rowsCount }).reduce((prev, _, i) => {
    const timestamp = startTime + i * 1000 + (Math.random() - 0.5) * 200;

    let randomValues: number[];

    if (i === 0) {
      // Initialize the first row with random baseline values
      randomValues = Array.from(
        { length: columnsCount - 1 },
        () => Math.random() * (max - min) + min
      );
      baselineValues = randomValues.slice(); // Set initial baseline
    } else {
      const previousValues = prev[i - 1].slice(1);

      if (peakActive) {
        if (peakDecayCounter > 0) {
          // Decay phase with slight randomness to simulate natural decay
          randomValues = previousValues.map(
            (value, index) =>
              value -
              (value - baselineValues[index]) * (0.2 + Math.random() * 0.1)
          );
          peakDecayCounter--;

          if (peakDecayCounter === 0) {
            // End of peak phase, reset to baseline
            peakActive = false;
            randomValues = baselineValues.slice();
          }
        } else {
          // Maintain peak levels with some minor random fluctuation
          randomValues = previousValues.map(
            (value) => value * (1 + Math.random() * 0.2)
          );
          peakDecayCounter = peakDuration; // Reset decay counter for gradual decline
        }
      } else {
        // Normal mode with small fluctuations around a slowly drifting baseline
        randomValues = previousValues.map((value, index) => {
          baselineValues[index] += (Math.random() - 0.5) * 0.02; // Slow baseline drift
          return value * (1 + (Math.random() - 0.5) * 0.03);
        });

        // Randomly trigger a peak with a small probability
        if (Math.random() < 0.1) {
          peakActive = true;
          peakDuration = Math.floor(5 + Math.random() * 5); // Peaks last 5-10 rows
          randomValues = previousValues.map(
            (value) => value * (1 + Math.random() * Math.random() * 0.5)
          );
        }
      }
    }

    const row = [timestamp, ...randomValues];
    return [...prev, row];
  }, [] as number[][]);
};
