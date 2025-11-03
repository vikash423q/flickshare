// remoteControls.js
// Unified video player controller for YouTube, Netflix, and Prime Video
// Enhanced with simplified state subscription system

class RemoteControlBase {
  constructor() {
    this.player = document.querySelector('video');
    this.stateSubscribers = new Set(); // Callbacks for state changes
    this.stateCheckInterval = null;
    this.lastDateTime = this.getDateTime();
    this.lastState = null;
    this.retryInterval = 2;
    this.init();
  }

  getDateTime(){
    return new Date().getTime()/1000;
  }

  init() {
    const tryInit = () => {
      this.player = document.querySelector('video');
      if (this.player) {
        console.log('🎬 Video player found');
      } else if (this.retryCount < 100) {
        this.retryCount++;
        console.log(`⏳ Player not found, retrying (${this.retryCount}/${this.maxRetries})...`);
        setTimeout(tryInit, this.retryInterval);
      } else {
        console.warn('⚠️ Failed to find video player after max retries');
      }
    };

    tryInit();
  }

  /** --- Basic controls --- **/
  play() {
    if (this.isLoaded()) this.player.play();
  }

  pause() {
    if (this.isLoaded()) this.player.pause();
  }

  togglePlayPause() {
    if (!this.isLoaded()) return;
    this.isPlaying() ? this.pause() : this.play();
  }

  seek(seconds) {
    if (this.isLoaded()) this.player.currentTime = seconds;
  }

  /** --- State helpers --- **/
  isLoaded() {
    return !!this.player;
  }

  isPlaying() {
    return this.isLoaded() && !this.player.paused && !this.player.ended;
  }

  getCurrentTime() {
    return this.isLoaded() ? this.player.currentTime : 0;
  }

  getDuration() {
    return this.isLoaded() ? this.player.duration : 0;
  }

  getPlaybackRate() {
    return this.isLoaded() ? this.player.playbackRate : 1;
  }

  setPlaybackRate(rate) {
    if (this.isLoaded()) this.player.playbackRate = rate;
  }

  getVolume() {
    return this.isLoaded() ? this.player.volume : 0;
  }

  setVolume(value) {
    if (this.isLoaded()) this.player.volume = value;
  }

  /** --- Get Current State --- **/
  getState() {
    return {
      isPlaying: this.isPlaying(),
      duration: this.getDuration(),
      currentTime: this.getCurrentTime(),
      playbackRate: this.getPlaybackRate(),
      volume: this.getVolume(),
      isLoaded: this.isLoaded()
    };
  }

  /** --- Simplified State Subscription System --- **/
  
  /**
   * Subscribe to video state changes
   * @param {Function} callback - Called with { isPlaying, duration, currentTime, ... }
   * @param {Object} options - { pollInterval: 500 } - How often to check state (ms)
   * @returns {Function} unsubscribe function
   */
  subscribe(callback, options = {}) {
    const pollInterval = options.pollInterval || 500;

    if (!this.isLoaded()) {
      console.warn('Player not loaded yet. Waiting...');
      
      // Wait for player to load
      const checkPlayerInterval = setInterval(() => {
        if (this.isLoaded()) {
          clearInterval(checkPlayerInterval);
          this.subscribe(callback, options);
        }
      }, 100);
      
      return () => clearInterval(checkPlayerInterval);
    }

    // Add callback to subscribers
    this.stateSubscribers.add(callback);

    // Start polling if not already running
    if (!this.stateCheckInterval) {
      this._startStatePolling(pollInterval);
    }

    // Send initial state immediately
    callback(this.getState());

    // Return unsubscribe function
    return () => this.unsubscribe(callback);
  }

  /**
   * Unsubscribe from state changes
   * @param {Function} callback - The callback to remove
   */
  unsubscribe(callback) {
    this.stateSubscribers.delete(callback);
    
    // Stop polling if no subscribers
    if (this.stateSubscribers.size === 0) {
      this._stopStatePolling();
    }
  }

  /**
   * Unsubscribe all callbacks
   */
  unsubscribeAll() {
    this.stateSubscribers.clear();
    this._stopStatePolling();
  }

  /** --- Internal State Polling --- **/
  _startStatePolling(interval) {
    this.stateCheckInterval = setInterval(() => {
      const currentState = this.getState();
      
      // Check if state changed
      if (this._hasStateChanged(currentState)) {
        // Notify all subscribers
        this.stateSubscribers.forEach(callback => {
          callback(currentState);
        });
        
        this.lastState = currentState;
        this.lastDateTime = this.getDateTime();
      }
    }, interval);
  }

  _stopStatePolling() {
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval);
      this.stateCheckInterval = null;
      this.lastState = null;
    }
  }

  _hasStateChanged(newState) {
    if (!this.lastState) return true;

    // Check if playing state changed
    if (newState.isPlaying !== this.lastState.isPlaying) return true;

    // Check if duration changed (new video loaded)
    const dateTimeDiff = this.getDateTime() - this.lastDateTime;
    const stateTimeDiff = newState.currentTime - this.lastState.currentTime;

    // Check if time jumped significantly (seek)
    if (newState.isPlaying && Math.abs(dateTimeDiff- stateTimeDiff) > 0.1) return true;

    // // Check if playback rate changed
    // if (newState.playbackRate !== this.lastState.playbackRate) return true;

    // // Check if volume changed
    // if (Math.abs(newState.volume - this.lastState.volume) > 0.01) return true;

    return false;
  }

  /** --- Cleanup --- **/
  destroy() {
    this.unsubscribeAll();
  }
}

class YouTubeControl extends RemoteControlBase {
  constructor() {
    super();
  }
}

class PrimeVideoControl extends RemoteControlBase {
  constructor() {
    super();
    this.observePlayer();
  }

  observePlayer() {
    const updatePlayer = () => {
      const video = document.querySelector('video');
      if (video && video !== this.player) {
        this.player = video;
        
        // Notify subscribers of player change
        const state = this.getState();
        this.stateSubscribers.forEach(callback => callback(state));
      }
    };

    updatePlayer();
    const observer = new MutationObserver(updatePlayer);
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

class NetflixControl extends RemoteControlBase {
  constructor() {
    super();
    this.initNetflixPlayer();
  }

  initNetflixPlayer(retries = 10) {
    try {
      const videoPlayer = window.netflix?.appContext?.state?.playerApp?.getAPI()?.videoPlayer;
      if (!videoPlayer) throw new Error('Netflix player not ready');

      const sessionId = videoPlayer.getAllPlayerSessionIds()[0];
      if (!sessionId) throw new Error('No session found');

      this.player = videoPlayer.getVideoPlayerBySessionId(sessionId);
    } catch (err) {
      if (retries > 0) {
        console.warn('Retrying Netflix player init...', err);
        setTimeout(() => this.initNetflixPlayer(retries - 1), 1000);
      } else {
        console.error('Failed to initialize Netflix player:', err);
      }
    }
  }

  /** Netflix-specific overrides **/
  isLoaded() {
    return !!this.player;
  }

  isPlaying() {
    try {
      return this.isLoaded() && this.player.isPlaying();
    } catch {
      return false;
    }
  }

  play() {
    try {
      this.player.play();
    } catch (err) {
      console.error('Netflix play failed:', err);
    }
  }

  pause() {
    try {
      this.player.pause();
    } catch (err) {
      console.error('Netflix pause failed:', err);
    }
  }

  seek(seconds) {
    try {
      this.player.seek(1000 * seconds); // Netflix uses ms
    } catch (err) {
      console.error('Netflix seek failed:', err);
    }
  }

  getCurrentTime() {
    try {
      return this.player.getCurrentTime() / 1000;
    } catch {
      return 0;
    }
  }

  getDuration() {
    try {
      return this.player.getDuration() / 1000;
    } catch {
      return 0;
    }
  }
}

/** Supported site map **/
export const supportedSites = {
  'youtube.com': YouTubeControl,
  // 'netflix.com': NetflixControl,
  'primevideo.com': PrimeVideoControl,
};

/** Factory to pick correct controller **/
const getVideoController = () => {
  const host = window.location.hostname;
  for (const site in supportedSites) {
    if (host.includes(site)) {
      return new supportedSites[site]();
    }
  }
  console.warn('No supported site found for:', host);
  return new RemoteControlBase();
};

export default getVideoController;

// ============================================
// USAGE EXAMPLES
// ============================================

/*
// Example 1: Basic subscription
const controller = getVideoController();

const unsubscribe = controller.subscribe((state) => {
  console.log('Video state:', state);
  // {
  //   isPlaying: true,
  //   duration: 3600,
  //   currentTime: 120.5,
  //   playbackRate: 1,
  //   volume: 0.8,
  //   isLoaded: true
  // }
});

// Later, unsubscribe
unsubscribe();


// Example 2: React Hook
import { useEffect, useState } from 'react';
import getVideoController from './remoteControls';

function useVideoState() {
  const [state, setState] = useState({
    isPlaying: false,
    duration: 0,
    currentTime: 0
  });

  useEffect(() => {
    const controller = getVideoController();
    
    const unsubscribe = controller.subscribe((newState) => {
      setState(newState);
    });

    return () => {
      unsubscribe();
      controller.destroy();
    };
  }, []);

  return state;
}

// Use in component
function VideoSync() {
  const { isPlaying, duration, currentTime } = useVideoState();

  return (
    <div>
      <div>Status: {isPlaying ? '▶️ Playing' : '⏸️ Paused'}</div>
      <div>Duration: {Math.floor(duration)}s</div>
      <div>Current: {Math.floor(currentTime)}s</div>
    </div>
  );
}


// Example 3: Multiple subscribers
const controller = getVideoController();

// Subscriber 1: Log to console
const unsub1 = controller.subscribe((state) => {
  console.log('Playing:', state.isPlaying);
});

// Subscriber 2: Send to server
const unsub2 = controller.subscribe((state) => {
  fetch('/api/video-state', {
    method: 'POST',
    body: JSON.stringify(state)
  });
});

// Subscriber 3: Update UI
const unsub3 = controller.subscribe((state) => {
  document.getElementById('status').textContent = 
    state.isPlaying ? 'Playing' : 'Paused';
});

// Unsubscribe all
controller.unsubscribeAll();


// Example 4: Custom poll interval
const controller = getVideoController();

// Check state every 100ms (more responsive)
const unsubscribe = controller.subscribe(
  (state) => {
    console.log('Fast update:', state);
  },
  { pollInterval: 100 }
);


// Example 5: Integration with WebSocket
const controller = getVideoController();
const ws = new WebSocket('ws://localhost:3000');

const unsubscribe = controller.subscribe((state) => {
  // Only send specific fields
  ws.send(JSON.stringify({
    type: 'video_state',
    isPlaying: state.isPlaying,
    duration: state.duration,
    currentTime: state.currentTime
  }));
});

// Cleanup
window.addEventListener('beforeunload', () => {
  unsubscribe();
  ws.close();
});


// Example 6: Detect specific changes
const controller = getVideoController();
let lastPlaying = false;

controller.subscribe((state) => {
  // Detect play/pause changes only
  if (state.isPlaying !== lastPlaying) {
    console.log(state.isPlaying ? 'Started playing' : 'Paused');
    lastPlaying = state.isPlaying;
  }
  
  // Detect when video loads
  if (state.duration > 0 && state.isLoaded) {
    console.log('Video loaded, duration:', state.duration);
  }
});
*/