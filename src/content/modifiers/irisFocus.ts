import { IrisFocusSettings } from '@/types';

let overlayElement: HTMLElement | null = null;
let driverScript: HTMLScriptElement | null = null;
let libraryScript: HTMLScriptElement | null = null;
let isInitialized = false;

const OVERLAY_ID = 'lexilens-iris-overlay';
const GAZE_EVENT = 'LEXILENS_GAZE_DATA';
const CMD_EVENT = 'LEXILENS_CMD';

/**
 * Handle gaze data from the driver
 */
function handleMessage(event: MessageEvent) {
  if (event.data.type === GAZE_EVENT && overlayElement) {
    const { x, y } = event.data.payload;
    if (typeof x === 'number' && typeof y === 'number') {
      overlayElement.style.setProperty('--x', `${x}px`);
      overlayElement.style.setProperty('--y', `${y}px`);
    }
  }
}

/**
 * Inject scripts into the page
 */
function injectScripts() {
  if (isInitialized) return;

  // Request injection from Background script (bypasses CSP)
  chrome.runtime.sendMessage({ type: 'INJECT_IRIS' });

  window.addEventListener('message', handleMessage);
  isInitialized = true;
}

/**
 * Enable Iris Focus
 */
export function enableIrisFocus(settings: IrisFocusSettings): void {
  // 1. Ensure scripts are injected
  injectScripts();

  // 2. Create Overlay if needed
  if (!overlayElement) {
    overlayElement = document.createElement('div');
    overlayElement.id = OVERLAY_ID;
    
    // Inject styles
    overlayElement.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      z-index: 2147483646;
      pointer-events: none;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      mask-image: radial-gradient(circle at var(--x, 50%) var(--y, 50%), transparent 0px, transparent var(--r, ${settings.spotlightRadius}px), black var(--r, ${settings.spotlightRadius}px));
      -webkit-mask-image: radial-gradient(circle at var(--x, 50%) var(--y, 50%), transparent 0px, transparent var(--r, ${settings.spotlightRadius}px), black var(--r, ${settings.spotlightRadius}px));
      transition: backdrop-filter 0.3s ease;
    `;
    
    document.documentElement.appendChild(overlayElement);
  } else {
    overlayElement.style.display = 'block';
  }

  // 3. Update Settings
  updateIrisFocus(settings);

  // 4. Start Driver
  // We need to wait for script load, but if it's already running, this sends the command.
  // If scripts are just injected, the driver will init and listen.
  setTimeout(() => {
    window.postMessage({ type: CMD_EVENT, command: 'START' }, '*');
  }, 1000); // Small delay for script load
}

/**
 * Update Iris Focus Settings
 */
export function updateIrisFocus(settings: IrisFocusSettings): void {
  if (overlayElement) {
    overlayElement.style.setProperty('--r', `${settings.spotlightRadius}px`);
  }
}

/**
 * Disable Iris Focus
 */
export function disableIrisFocus(): void {
  if (overlayElement) {
    overlayElement.style.display = 'none';
  }

  // Stop Driver
  window.postMessage({ type: CMD_EVENT, command: 'STOP' }, '*');
}

/**
 * Toggle Calibration Overlay (managed by UI usually, but driver command here)
 */
export function startCalibration(): void {
  window.postMessage({ type: CMD_EVENT, command: 'TOGGLE_VIDEO', value: true }, '*');
  // In a real implementation, we would show a calibration UI here
}
