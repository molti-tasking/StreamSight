// import jsonDataSP500 from "public/data/20250228_stock_sp500_data.json";
// import jsonDataGDP from "public/data/20250228_un_gdp_data.json";

export type DataSet = "S&P500" | "GDP";
// const dataSources: Record<DataSet, string> = {
//   "S&P500": jsonDataSP500,
//   GDP: jsonDataGDP,
// };

const dataSourceUrls: Record<DataSet, string> = {
  "S&P500": "/data/20250228_stock_sp500_data.json",
  GDP: "/data/20250228_un_gdp_data.json",
};

async function fetchDataSet(dataSet: DataSet) {
  const res = await fetch(dataSourceUrls[dataSet]);
  return res.json();
}

const minTimeout = 2000;

type DataEntry = {
  timestamp: number;
  [x: string]: number | null;
};

export async function* streamDataSet(
  dataSet: DataSet
): AsyncGenerator<DataEntry> {
  const dataEntries: DataEntry[] = await fetchDataSet(dataSet);

  console.log("Stream of data set. Entries count: ", dataSet.length);

  for (const item of dataEntries) {
    yield new Promise<DataEntry>((resolve) => {
      safeRequestIdleCallback(() => resolve(item), minTimeout);
    });
  }
}

function safeRequestIdleCallback(callback: () => void, minTimeout = 3000) {
  if ("requestIdleCallback" in window) {
    return setTimeout(() => requestIdleCallback(callback), minTimeout);
  } else {
    return setTimeout(callback, minTimeout);
  }
}
