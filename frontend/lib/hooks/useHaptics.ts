/**
 * useHaptics — thin wrapper around navigator.vibrate() for PWA haptic feedback.
 * Silently no-ops on unsupported browsers/desktop.
 */
export function useHaptics() {
  const vibrate = (pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern)
    }
  }

  return {
    /** Very short tap — button press */
    light: () => vibrate(10),
    /** Medium tap — selection / toggle */
    medium: () => vibrate(25),
    /** Double pulse — success / confirmed add */
    success: () => vibrate([10, 60, 20]),
    /** Short buzz — delete / destructive action */
    delete: () => vibrate([30, 20, 30]),
    /** Triple pulse — goal completed / milestone */
    milestone: () => vibrate([20, 40, 20, 40, 40]),
  }
}
