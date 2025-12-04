import { useEffect, useRef } from "react";

export interface SessionTimeoutConfig {
  /** Session timeout duration in milliseconds (default: 30 minutes) */
  sessionTimeout?: number;
  /** Warning time before logout in milliseconds (default: 5 minutes) */
  warningTime?: number;
  /** Minimum time between activity resets in milliseconds (default: 1 minute) */
  minActivityInterval?: number;
  /** Callback when warning should be shown */
  onWarning?: (timeLeftMinutes: number) => boolean | void;
  /** Callback when session should timeout */
  onTimeout?: () => void | Promise<void>;
}

/**
 * Custom hook to track user activity and manage session timeout
 * 
 * @param isActive - Whether the session is currently active (user is logged in)
 * @param config - Configuration options for session timeout
 */
export function useSessionTimeout(
  isActive: boolean,
  config: SessionTimeoutConfig = {}
) {
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const onWarningRef = useRef<SessionTimeoutConfig["onWarning"]>();
  const onTimeoutRef = useRef<SessionTimeoutConfig["onTimeout"]>();
  const isActiveRef = useRef<boolean>(isActive);

  const {
    sessionTimeout = 30 * 60 * 1000, // 30 minutes
    warningTime = 5 * 60 * 1000, // 5 minutes
    minActivityInterval = 60 * 1000, // 1 minute
    onWarning,
    onTimeout,
  } = config;

  // Store callbacks and active state in refs to avoid dependency issues
  useEffect(() => {
    onWarningRef.current = onWarning;
    onTimeoutRef.current = onTimeout;
    isActiveRef.current = isActive;
  }, [onWarning, onTimeout, isActive]);

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();

    // Clear existing timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }

    if (!isActiveRef.current) return;

    // Set warning timer (before logout)
    warningTimerRef.current = setTimeout(() => {
      const timeLeftMinutes = Math.ceil(warningTime / 1000 / 60);
      
      if (onWarningRef.current) {
        const shouldContinue = onWarningRef.current(timeLeftMinutes);
        // If onWarning returns true or undefined, reset timer
        if (shouldContinue !== false) {
          resetInactivityTimer();
        }
      } else {
        // Default warning behavior
        if (typeof window !== "undefined" && window.confirm(
          `You've been inactive for a while. You'll be logged out in ${timeLeftMinutes} minute${timeLeftMinutes !== 1 ? 's' : ''} due to inactivity. Click OK to stay logged in.`
        )) {
          resetInactivityTimer();
        }
      }
    }, sessionTimeout - warningTime);

    // Set logout timer
    inactivityTimerRef.current = setTimeout(async () => {
      if (isActiveRef.current && onTimeoutRef.current) {
        await onTimeoutRef.current();
      }
    }, sessionTimeout);
  };

  // Track user activity
  useEffect(() => {
    if (!isActive) {
      // Clear timers when session is inactive
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
      return;
    }

    // Initialize timer when session is active
    resetInactivityTimer();

    // Track various user activities
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    const handleActivity = () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      // Only reset if it's been at least minActivityInterval since last activity
      if (timeSinceLastActivity > minActivityInterval) {
        resetInactivityTimer();
      }
    };

    // Add event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, true);
    });

    // Also track visibility changes (when user switches tabs/windows)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetInactivityTimer();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      // Cleanup event listeners
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity, true);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      
      // Clear timers on cleanup
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, sessionTimeout, warningTime, minActivityInterval]);
}

