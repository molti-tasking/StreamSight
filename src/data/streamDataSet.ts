import jsonDataSP500 from "./20250228T15:39_stock_sp500_data.json?raw";
import jsonDataGDP from "./20250228T19:02_un_gdp_data.json?raw";

export type DataSet = "S&P500" | "GDP";

const dataSources: Record<DataSet, string> = {
  "S&P500": jsonDataSP500,
  GDP: jsonDataGDP,
};

const minTimeout = 2000;

type DataEntry = {
  timestamp: number;
  [x: string]: number | null;
};

export async function* streamDataSet(
  dataSet: DataSet
): AsyncGenerator<DataEntry> {
  const dataEntries: DataEntry[] = JSON.parse(dataSources[dataSet]);

  console.log("Stream of stocks: ", dataSet.length);

  for (const item of dataEntries) {
    yield new Promise<DataEntry>((resolve) => {
      safeRequestIdleCallback(() => resolve(item), minTimeout);
    });
  }
}

function safeRequestIdleCallback(callback: () => void, minTimeout = 1000) {
  if ("requestIdleCallback" in window) {
    return setTimeout(() => requestIdleCallback(callback), minTimeout);
  } else {
    return setTimeout(callback, minTimeout);
  }
}
