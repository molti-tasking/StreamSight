import jsonData from "./20241127T20:36_household_data.json?raw";

export const loadHouseholdData = (): {
  [x: string]: number;
  timestamp: number;
}[] => {
  return JSON.parse(jsonData);
};
