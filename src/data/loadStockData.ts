import jsonData from "./20241127T20:10_stock_data.json?raw";

export const loadStockData = (): {
  [x: string]: number;
  timestamp: number;
}[] => {
  return JSON.parse(jsonData);
};
