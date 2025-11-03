(function () {
  const POLL_INTERVAL = 2000;

  const getNetflixPlayer = () => {
    try {
      return window.netflix?.appContext?.state?.playerApp?.getAPI()?.videoPlayer || null;
    } catch {
      return null;
    }
  };

  const getPlayerData = (playerInstance) => {
    try {
      return {
        currentTime: playerInstance.getCurrentTime(),
        duration: playerInstance.getDuration(),
        paused: playerInstance.isPaused(),
      };
    } catch (e) {
      console.error("Netflix: failed to get player data", e);
      return null;
    }
  };

  const waitForPlayer = setInterval(() => {
    const player = getNetflixPlayer();
    if (!player) {
      console.log("Netflix: waiting for player...");
      return;
    }

    const sessionIds = player.getAllPlayerSessionIds?.();
    const sessionId = sessionIds?.[0];
    if (!sessionId) {
      console.log("Netflix: waiting for session...");
      return;
    }

    const playerInstance = player.getVideoPlayerBySessionId(sessionId);
    if (!playerInstance) {
      console.log("Netflix: waiting for player instance...");
      return;
    }

    console.log("Netflix: player ready ✅");
    clearInterval(waitForPlayer);

    // Start polling for data
    setInterval(() => {
      const data = getPlayerData(playerInstance);
      if (data) {
        window.postMessage({
          source: "netflix-extension",
          type: "NETFLIX_DATA",
          data,
        }, "*");
      }
    }, POLL_INTERVAL);

  }, 1000);
})();