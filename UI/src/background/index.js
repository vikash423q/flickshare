chrome.runtime.onInstalled.addListener(() => {
  console.log('FlickCall Clone extension installed');
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  if (message.action === 'injectContentScript') {
    // Inject content script into specific tab
    chrome.scripting.executeScript({
      target: { tabId: message.tabId },
      files: ["assets/index.jsx-loader.js"]
    }).then(() => {
      console.log('Content script injected successfully');
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('Error injecting content script:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Keep message channel open for async response
  }
  
  // Forward other messages to content script
  if (message.action === 'forwardToContent') {
    chrome.tabs.sendMessage(message.tabId, message.data, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error forwarding message:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse(response);
      }
    });
    
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