import React from 'react';
import ReactDOM from 'react-dom/client';
import SidePanel from '../components/SidePanel';
// import is not supported in manifest v3 content scripts
// const React = require('react');
// const ReactDOM = require('react-dom/client');
// const SidePanel = require('./SidePanel');

let root = null;
let container = null;
let isActive = false;
const PANEL_WIDTH = 300; // Width of the side panel in pixels

// Create container for side panel
const createContainer = () => {
  if (container) return container;

  container = document.createElement('div');
  container.id = 'flickcall-sidepanel-root';
  
  // Add to body with highest z-index
  container.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: ${PANEL_WIDTH}px;
    height: 100vh;
    z-index: 2147483647;
    pointer-events: none;
  `;
  
  document.body.appendChild(container);
  return container;
};

// Initialize side panel
const initPanel = () => {
  const exist = document.querySelector('#flickcall-sidepanel-root');
  if (exist) {
    isActive = true;
    return;
  }
  if (root) return;

  const panelContainer = createContainer();
  root = ReactDOM.createRoot(panelContainer);
  
  
  root.render(
    <React.StrictMode>
      <SidePanel onClose={closePanel} />
    </React.StrictMode>
  );
};

// Close side panel
const closePanel = () => {
  if (root) {
    root.unmount();
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  isActive = false;
};

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'togglePanel') {
    if (isActive) {
      closePanel();
    } else {
      initPanel();
    }
    sendResponse({ isActive });
    return true;
  }

  if (message.action === 'openPanel') {
    initPanel();
    sendResponse({ isActive: true });
    return true;
  }

  if (message.action === 'closePanel') {
    closePanel();
    sendResponse({ isActive: false });
    return true;
  }

  if (message.action === 'checkPanelStatus') {
    sendResponse({ isActive });
    return true;
  }
});

// Auto-initialize (optional - remove if you only want manual trigger)
// initPanel();