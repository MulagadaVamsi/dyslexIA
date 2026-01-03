/**
 * Iris Driver - Runs in the MAIN WORLD (Page Context)
 * Bridges WebGazer.js with LexiLens Content Script
 */

(function() {
  const GAZE_EVENT = 'LEXILENS_GAZE_DATA';
  let isRunning = false;
  let pendingStart = false; // Queue start if library not ready

  function initWebGazer() {
    if (!window.webgazer) {
      console.warn('[LexiLens] WebGazer not ready, retrying...');
      setTimeout(initWebGazer, 500);
      return;
    }

    // Configure WebGazer
    window.webgazer
      .setRegression('ridge')
      .setTracker('TFFacemesh')
      .showVideoPreview(true)
      .showFaceOverlay(false)
      .showFaceFeedbackBox(true)
      .saveDataAcrossSessions(true)
      .setGazeListener((data, clock) => {
        if (data && isRunning) {
          window.postMessage({
            type: GAZE_EVENT,
            payload: { x: data.x, y: data.y }
          }, '*');
        }
      });
      
    console.log('[LexiLens] WebGazer initialized');
    
    // Auto-start if pending
    if (pendingStart) {
      console.log('[LexiLens] Executing pending START');
      window.webgazer.begin();
      window.webgazer.showVideoPreview(true);
      isRunning = true;
      pendingStart = false;
    }
  }

  // Listen for commands from Content Script
  window.addEventListener('message', (event) => {
    if (event.data.type === 'LEXILENS_CMD') {
      const { command, value } = event.data;
      
      console.log('[LexiLens] Driver received:', command);

      if (command === 'START') {
        if (window.webgazer) {
          window.webgazer.begin();
          window.webgazer.showVideoPreview(true);
          isRunning = true;
        } else {
          console.log('[LexiLens] Queuing START');
          pendingStart = true;
        }
      } else if (command === 'STOP') {
        if (window.webgazer) {
          window.webgazer.pause();
          window.webgazer.showVideoPreview(false);
        }
        isRunning = false;
        pendingStart = false;
      } else if (command === 'CALIBRATE_POINT') {
        // ...
      } else if (command === 'TOGGLE_VIDEO') {
        if (window.webgazer) window.webgazer.showVideoPreview(value);
      }
    }
  });

  // Start initialization loop
  initWebGazer();
})();
