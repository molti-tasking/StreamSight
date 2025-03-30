import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function deepMerge(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj1: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj2: Record<string, any>
) {
  const result = { ...obj1 };
  for (const key in obj2) {
    if (Array.isArray(obj2[key]) && Array.isArray(obj1[key])) {
      result[key] = obj1[key].concat(obj2[key]);
    } else if (obj2[key] instanceof Object && key in obj1) {
      result[key] = deepMerge(obj1[key], obj2[key]);
    } else {
      result[key] = obj2[key];
    }
  }
  return result;
}

export const monitoringPeriodOptions = {
  "1 min": 1 * 60 * 1000,
  "10 min": 10 * 60 * 1000,
  "1 hour": 60 * 60 * 1000,
  "1 day": 24 * 60 * 60 * 1000,
  "30 days": 30 * 24 * 60 * 60 * 1000,
  "1 year": 365 * 24 * 60 * 60 * 1000,
  "10 years": 10 * 365 * 24 * 60 * 60 * 1000,
};
