/**
 * Tactile haptic vibration utility for mobile devices on shop floors.
 * Provides physical sensory confirmation in loud workshop environments.
 * Silently degrades if unsupported.
 */
export function triggerHaptic(pattern: number | number[] = 30) {
  if (typeof window !== "undefined" && "navigator" in window && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignored on unsupported hardware/permissions
    }
  }
}
