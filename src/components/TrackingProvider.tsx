import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  trackPageView,
  initUniversalClickTracker,
  initScrollTracking,
  initExitTracking,
  initSession,
  flushQueue,
  requestGPS,
  getVisitorId,
} from "@/lib/tracking";

let clickTrackerInitialized = false;
let gpsRequested = false;

export default function TrackingProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const cleanupRef = useRef<(() => void) | null>(null);
  const exitCleanupRef = useRef<(() => void) | null>(null);

  // One-time initialization
  useEffect(() => {
    try {
      // Ensure visitor ID exists
      getVisitorId();

      // Initialize session timer
      initSession();

      // Initialize click tracker once
      if (!clickTrackerInitialized) {
        initUniversalClickTracker();
        clickTrackerInitialized = true;
      }

      // Request GPS silently on first load
      if (!gpsRequested) {
        gpsRequested = true;
        requestGPS().catch(() => {});
      }

      // Flush any failed records from localStorage queue
      flushQueue().catch(() => {});
    } catch {
      // RULE 2: Never show errors to user
    }
  }, []);

  // Per-page tracking
  useEffect(() => {
    if (location.pathname.startsWith("/admin")) return;

    try {
      // Track page view (fire-and-forget)
      trackPageView(location.pathname);

      // Init scroll tracking for this page
      if (cleanupRef.current) cleanupRef.current();
      const stopScroll = initScrollTracking(location.pathname);
      cleanupRef.current = stopScroll;

      // Init exit tracking
      if (exitCleanupRef.current) exitCleanupRef.current();
      exitCleanupRef.current = initExitTracking(location.pathname);
    } catch {
      // RULE 2
    }

    return () => {
      if (cleanupRef.current) {
        try { cleanupRef.current(); } catch { /* ignore */ }
        cleanupRef.current = null;
      }
    };
  }, [location.pathname]);

  return <>{children}</>;
}
