chrome.runtime.onInstalled.addListener(() => {
  console.log('FlickCall Clone extension installed');
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  if (message.action === "joinParty") {
    console.log("Listening for tab load to join party...");
    
    const { tabId, roomId } = message;
    
    const listener = (updatedTabId, changeInfo, tab) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        console.log("Tab finished loading, injecting panel...");
  
        chrome.scripting.executeScript({
          target: { tabId },
          files: ["assets/index.jsx-loader.js"]
        }).then(() => {
          console.log("Loader injected, waiting for contentReady...");
          
          const readyListener = (msg) => {
            if (msg.action === "contentReady") {
              console.log("Content ready, opening panel...");
              chrome.tabs.sendMessage(tabId, { action: "openPanel", roomId });
              chrome.runtime.onMessage.removeListener(readyListener);
            }
          };
          chrome.runtime.onMessage.addListener(readyListener);
        });
  
        chrome.tabs.onUpdated.removeListener(listener);
      }
    };
  
    chrome.tabs.onUpdated.addListener(listener);
    sendResponse({ success: true });
    return true;
  }
  
});

// Handle tab updates (optional - for persisting state)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Check if this tab had panel open before
    chrome.storage.local.get([`panelState_${tabId}`], (result) => {
      const panelState = result[`panelState_${tabId}`];
      if (panelState && panelState.isOpen) {
        // Re-inject panel if it was open
        chrome.tabs.sendMessage(tabId, { action: 'restorePanel' }, () => {
          if (chrome.runtime.lastError) {
            // Ignore errors
          }
        });
      }
    });
  }
});

// Clean up storage when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`panelState_${tabId}`);
});