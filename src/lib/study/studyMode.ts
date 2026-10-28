const KEY = "streamsight.studyMode";

/**
 * Study mode: analytics (PostHog) is never initialised and interaction logs
 * stay on this device. Turned on with `?study=1` and off with `?study=0`;
 * remembered in localStorage so it survives navigation between pages.
 */
export function isStudyMode(): boolean {
  if (typeof window === "undefined") return false;
  const param = new URLSearchParams(window.location.search).get("study");
  try {
    if (param === "1") localStorage.setItem(KEY, "1");
    if (param === "0") localStorage.removeItem(KEY);
    return localStorage.getItem(KEY) === "1";
  } catch {
    return param === "1";
  }
}
