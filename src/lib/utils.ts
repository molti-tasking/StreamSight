import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Escape a value for safe interpolation into a single-quoted Vega expression
 * string literal (e.g. `datum.variable === '<here>'`). Dimension / stream names
 * originate from dataset column names, which are only semi-trusted; escaping the
 * backslash and single-quote prevents breaking out of the string literal into an
 * arbitrary Vega expression while still matching the real field name.
 */
export function escapeVegaString(value: string): string {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
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
