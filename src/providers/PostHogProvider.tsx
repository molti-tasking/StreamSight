// app/providers.tsx
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { usePostHog } from "posthog-js/react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { isStudyMode } from "@/lib/study/studyMode";

const POST_HOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY as string;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Study mode: analytics stays off completely (never initialised, so no
    // requests and no session recording).
    if (isStudyMode()) {
      if (posthog.__loaded) posthog.opt_out_capturing();
      return;
    }
    if (POST_HOG_KEY && !posthog.__loaded) {
      posthog.init(POST_HOG_KEY, {
        api_host: "/ingest",
        ui_host: "https://eu.posthog.com",
        person_profiles: "identified_only", // or 'always' to create profiles for anonymous users as well
        capture_pageview: false, // Disable automatic pageview capture, as we capture manually
      });
    }
  }, []);

  return (
    <PHProvider client={posthog}>
      <SuspendedPostHogPageView />
      {children}
    </PHProvider>
  );
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  // Track pageviews
  useEffect(() => {
    if (pathname && posthog && posthog.__loaded && !isStudyMode()) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + "?" + searchParams.toString();
      }

      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams, posthog]);

  return null;
}

// Wrap PostHogPageView in Suspense to avoid the useSearchParams usage above
// from de-opting the whole app into client-side rendering
// See: https://nextjs.org/docs/messages/deopted-into-client-rendering
function SuspendedPostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  );
}
