(function () {
  'use strict';

  const injectTime = performance.now();
  (async () => {
    const { onExecute } = await import(
      /* @vite-ignore */
      chrome.runtime.getURL("assets/video.js.js")
    );
    onExecute?.({ perf: { injectTime, loadTime: performance.now() - injectTime } });
    chrome.runtime.sendMessage({ action: "videoReady" });
  })().catch(console.error);

})();
