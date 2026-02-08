/**
 * Device Detection Utilities
 *
 * Utilities for detecting device type and capabilities
 */

/**
 * Check if the current device is a mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Check using userAgent
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

  // Also check screen width as a fallback
  const isSmallScreen = window.innerWidth <= 768;

  return mobileRegex.test(userAgent) || isSmallScreen;
}

/**
 * Check if the device supports camera access via getUserMedia
 */
export function hasCameraSupport(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Check if the app is running in standalone PWA mode
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check display-mode media query
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  // iOS Safari specific check
  const isIOSStandalone = (window.navigator as any).standalone === true;

  return isStandalone || isIOSStandalone;
}

/**
 * Get available camera devices
 */
export async function getCameraDevices(): Promise<MediaDeviceInfo[]> {
  if (!hasCameraSupport()) {
    return [];
  }

  try {
    // Request permission first to get device labels
    await navigator.mediaDevices.getUserMedia({ video: true });

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  } catch {
    return [];
  }
}

/**
 * Check if device has multiple cameras (front and back)
 */
export async function hasMultipleCameras(): Promise<boolean> {
  const cameras = await getCameraDevices();
  return cameras.length > 1;
}

/**
 * Request camera permission and check if granted
 */
export async function requestCameraPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!hasCameraSupport()) {
    return 'denied';
  }

  try {
    // Check if Permissions API is available
    if (navigator.permissions) {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state;
    }

    // Fallback: try to access camera
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    return 'granted';
  } catch {
    return 'denied';
  }
}
