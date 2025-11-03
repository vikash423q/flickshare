import React, { useState, useEffect, useRef } from 'react';
import getVideoController from '../content/video';


const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${hrs.toString().padStart(2, '0')}:` +
         `${mins.toString().padStart(2, '0')}:` +
         `${secs.toString().padStart(2, '0')}`;
}

const SidePanel = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [name, setName] = useState('');
  const [token, setToken] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [userId, setUserId] = useState('');
  const [backendUrl, setbackendUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'sync'
  const pingIntervalRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default dark mode
  const [coolDown, setCoolDown] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidepanel_darkmode', isDarkMode);
  }, [isDarkMode]);

  // Theme colors
  const theme = {
    bg: isDarkMode ? '#1a1a1a' : '#ffffff',
    bgSecondary: isDarkMode ? '#2d2d2d' : '#f9fafb',
    bgTertiary: isDarkMode ? '#3d3d3d' : '#fafafa',
    text: isDarkMode ? '#e5e5e5' : '#1f2937',
    textSecondary: isDarkMode ? '#a0a0a0' : '#6b7280',
    textMuted: isDarkMode ? '#707070' : '#9ca3af',
    border: isDarkMode ? '#404040' : '#e5e7eb',
    messageBg: isDarkMode ? '#2a2a2a' : 'white',
    systemBg: isDarkMode ? '#3d2a1f' : '#fef3c7',
    systemText: isDarkMode ? '#fbbf24' : '#92400e',
    inputBg: isDarkMode ? '#2d2d2d' : 'white',
    inputBorder: isDarkMode ? '#404040' : '#d1d5db',
  };
  
  const wsRef = useRef(null);
  const vcRef = useRef(null);
  const messagesEndRef = useRef(null);

   useEffect(() => {
    chrome.storage.local.set({darkMode : isDarkMode})
  }, [isDarkMode]);

  useEffect(() => {
    // Load saved user ID and room ID
    chrome.storage.local.get(['userId', 'roomId', 'name', 'token', 'backendUrl', 'darkMode'], (result) => {
      if (result.userId) {
        setUserId(result.userId);
      }
      if (result.roomId) {
        setRoomId(result.roomId);
      }
      if (result.name) {
        setName(result.name);
      }
      if (result.token) {
        setToken(result.token);
      }
      if (result.backendUrl) {
        setbackendUrl(result.backendUrl);
      }
    });

  }, []);

  useEffect(() => {
    if (userId) {
      chrome.storage.local.set({ userId });
    }
  }, [userId]);

  useEffect(() => {
    if (roomId) {
      chrome.storage.local.set({ roomId }, () => {  
        connectWebSocket();
      })
    }
  }, [roomId]);

  const toWebSocketURL = (url) => {
    return url.replace(/^http(s?):\/\//, 'ws$1://');
  }

  // In your SidePanel component
  useEffect(() => {
    if(isConnected){
      vcRef.current = getVideoController();
    
      const unsubscribe = vcRef.current.subscribe((state) => {
        if (coolDown) {
          console.log('blocking event due to cooldown');
          return;
        }
        // Send to WebSocket
        wsRef.current.send(JSON.stringify({
          actionType: 'media',
          type: 'video_state',
          isPlaying: state.isPlaying,
          duration: state.duration,
          currentTime: state.currentTime,
          roomId: roomId,
          token: token
        }));
      });

      return () => {
        unsubscribe();
        vcRef.current = null;
      }
    }
  }, [isConnected]);

  const connectWebSocket = () => {
    if (wsRef.current) return;

    wsRef.current = new WebSocket(toWebSocketURL(backendUrl));

    wsRef.current.onopen = () => {
      setIsConnected(true);
      wsRef.current.send(JSON.stringify({
        type: 'join',
        roomId,
        token,
      }));
      addSystemMessage(`Connected to room: ${roomId}`);

      pingIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'ping',
            timestamp: Date.now()
          }));
        }
      }, 12000);
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      addSystemMessage('Disconnected');
      disconnectWebSocket();

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      addSystemMessage('Connection error');
    };
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'joined':
        addSystemMessage('You joined the room');
        break;
      case 'message':
        addMessage(data.userId, data.content, data.timestamp);
        break;
      case 'user_joined':
        if (data.userId !== userId) {
          addSystemMessage(`${data.name} joined`);
        }
        break;
      case 'user_left':
        addSystemMessage(`${data.name} left`);
        break;
      case 'video_state':
        handleVideoState(data);
        break;
      case 'pong':
        const latencyMs = Date.now() - JSON.parse(data).timestamp;
        console.log(`Latency: ${latencyMs}ms`);
        break;
    }
  };

  const addMessage = (user, content, timestamp) => {
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      name,
      user,
      content,
      timestamp: timestamp || Date.now(),
      type: 'message'
    }]);
  };

  const addSystemMessage = (content) => {
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      content,
      type: 'system',
      timestamp: Date.now()
    }]);
  };
  const sendMessage = () => {
    if (!inputMessage.trim() || !isConnected) return;

    wsRef.current.send(JSON.stringify({
      roomId,
      token,
      type: 'message',
      content: inputMessage
    }));

    setInputMessage('');
  };

  const humanReadable = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
  
    return [hrs, mins, secs]
      .map(v => String(v).padStart(2, '0'))
      .join(':');
  }

  const handleVideoState = (data) => {
      if (vcRef.current) {
        let controller = vcRef.current;
        let updated = false;
        let systemMsg = data.name;
        console.log(`Remote player state update from ${data.name} IsPlaying: ${data.isPlaying} CurrentTime: ${data.currentTime}`)
        if(controller.isLoaded()){
          if(controller.isPlaying() !== data.isPlaying){
            console.log(`Remote toggle play/pause to sync with ${data.name}`);
            controller.togglePlayPause();
            updated = true;
            systemMsg += data.isPlaying ? ' played video' : ' paused video';
          }
          if(Math.abs(controller.getCurrentTime() - data.currentTime) > 1){
            console.log(`Remote seek to sync with ${data.name}`);
            controller.seek(data.currentTime);
            systemMsg += !updated ? ` moved to ${humanReadable(data.currentTime)}` : ` at ${humanReadable(data.currentTime)}`
            updated = true;
          }
        }
        if (updated){
          setCoolDown(true);
          setTimeout(()=>setCoolDown(false), 2000);
          addSystemMessage(systemMsg);
        }
      } else {
        console.error("Video controller not found!")
      }
      
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClose = () => {
    setIsOpen(false);
    disconnectWebSocket();
    chrome.storage.local.remove(['roomId']);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  useEffect(() => {
      const video = document.querySelector('video');
      if (video) {
        const aspect = video.clientHeight / video.clientWidth;
        if (isOpen) {
          video.style.width = (video.clientWidth - 240) + 'px';
          video.style.height = (video.clientWidth) * aspect + 'px'; 
        } else {
          video.style.width = (video.clientWidth + 240) + 'px';
          video.style.height = (video.clientWidth) * aspect + 'px'; 
        }
      }
 
    }, [isOpen]);

  useEffect(() => {

  }, [isConnected]);

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ pointerEvents: 'all' }}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.5';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.15';
        }}
        style={{
          position: 'fixed',
          right: isOpen ? '280px' : '0',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '24px',
          height: '50px',
          background: 'rgba(0, 0, 0, 0.6)',
          border: 'none',
          borderRadius: isOpen ? '6px 0 0 6px' : '0',
          cursor: 'pointer',
          zIndex: 2147483646,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '14px',
          boxShadow: 'none',
          transition: 'right 0.3s ease, opacity 0.2s ease',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          opacity: '0.25',
          backdropFilter: 'blur(4px)'
        }}
      >
        {isOpen ? '››' : '‹‹'}
      </button>

      {/* Side Panel */}
      <div
        style={{
          position: 'fixed',
          right: isOpen ? '0' : '-300px',
          top: '0',
          width: '280px',
          height: '100vh',
          background: theme.bg,
          boxShadow: isDarkMode 
            ? '-2px 0 20px rgba(0,0,0,0.5)' 
            : '-2px 0 20px rgba(0,0,0,0.15)',
          zIndex: 2147483647,
          transition: 'right 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: theme.text
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
              Flickshare 🎬
            </h2>

            <p style={{ margin: '5px 0 0 0', fontSize: '12px', fontWeight: '600', opacity: 0.9 }}>
              {name} • {isConnected ? '🟢  Online' : '🔴  Offline'}
            </p>
            
            <button
              onClick={handleCopy}
              title="Click to copy Room ID"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              <p
                style={{
                  margin: '5px 0 0 0',
                  fontSize: '12px',
                  opacity: 0.9,
                  userSelect: 'none',
                }}
              >
                {copied ? 'Copied! ✅' : `Room: ${roomId} 📋`}
              </p>
            </button>
         
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            {/* Close Button */}
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${theme.border}`,
          background: theme.bgSecondary
        }}>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'chat' ? theme.bg : 'transparent',
              borderBottom: activeTab === 'chat' ? '2px solid #667eea' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: activeTab === 'chat' ? '#667eea' : theme.textSecondary,
              transition: 'all 0.2s'
            }}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'sync' ? theme.bg : 'transparent',
              borderBottom: activeTab === 'sync' ? '2px solid #667eea' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: activeTab === 'sync' ? '#667eea' : theme.textSecondary,
              transition: 'all 0.2s'
            }}
          >
            🔄 Sync
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeTab === 'chat' ? (
            <>
              {/* Setup Section */}
              {!isConnected && (
                <div style={{ 
                  padding: '15px', 
                  background: theme.bgSecondary, 
                  borderBottom: `1px solid ${theme.border}` 
                }}>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ 
                      fontSize: '12px', 
                      color: theme.textSecondary, 
                      display: 'block', 
                      marginBottom: '5px' 
                    }}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      disabled
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: `1px solid ${theme.inputBorder}`,
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: theme.inputBg,
                        color: theme.text
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ 
                      fontSize: '12px', 
                      color: theme.textSecondary, 
                      display: 'block', 
                      marginBottom: '5px' 
                    }}>
                      Room ID
                    </label>
                    <input
                      type="text"
                      value={roomId}
                      disabled
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: `1px solid ${theme.inputBorder}`,
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: theme.inputBg,
                        color: theme.text
                      }}
                    />
                  </div>
                  <button
                    onClick={connectWebSocket}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Reconnect to Room
                  </button>
                </div>
              )}

              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '15px',
                background: theme.bgTertiary
              }}>
                {messages.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    color: theme.textMuted, 
                    marginTop: '50px', 
                    fontSize: '14px' 
                  }}>
                    {isConnected ? 'No messages yet. Say hi! 👋' : 'Connect to start chatting'}
                  </div>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      style={{
                        marginBottom: '12px',
                        padding: msg.type === 'system' ? '8px 12px' : '10px 14px',
                        background: msg.type === 'system' 
                          ? theme.systemBg
                          : msg.user === userId 
                            ? '#667eea' 
                            : theme.messageBg,
                        color: msg.type === 'system' 
                          ? theme.systemText
                          : msg.user === userId 
                            ? 'white' 
                            : theme.text,
                        borderRadius: '10px',
                        fontSize: '14px',
                        boxShadow: msg.type === 'system' 
                          ? 'none' 
                          : isDarkMode 
                            ? '0 1px 3px rgba(0,0,0,0.3)' 
                            : '0 1px 3px rgba(0,0,0,0.1)',
                        fontStyle: msg.type === 'system' ? 'italic' : 'normal',
                        marginLeft: msg.user === userId ? '40px' : '0',
                        marginRight: msg.user === userId ? '0' : '40px'
                      }}
                    >
                      {msg.type === 'message' && msg.user !== userId && (
                        <div style={{ 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          marginBottom: '4px', 
                          opacity: 0.8 
                        }}>
                          {msg.name}
                        </div>
                      )}
                      <div style={{color: msg.type === 'system' 
                          ? theme.systemText
                          : msg.user === userId 
                            ? 'white' 
                            : theme.text}}>{msg.content}</div>
                      {msg.type === 'message' && (
                        <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                          {new Date(msg.timestamp).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {isConnected && (
                <div style={{
                  padding: '15px',
                  borderTop: `1px solid ${theme.border}`,
                  background: theme.bg
                }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        border: `1px solid ${theme.inputBorder}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        background: theme.inputBg,
                        color: theme.text
                      }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim()}
                      style={{
                        padding: '10px 20px',
                        background: inputMessage.trim() ? '#667eea' : theme.inputBorder,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Sync Tab
            <div style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '15px', color: theme.text }}>
                Video Call
              </h3>
              <div style={{
                padding: '15px',
                background: theme.systemBg,
                borderRadius: '8px',
                fontSize: '13px',
                color: theme.systemText,
                marginBottom: '15px'
              }}>
                <strong>🚧 Coming Soon</strong><br/>
                Video call feature will allow everyone in the room to watch at the same time.
              </div>
              <button
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  marginBottom: '10px'
                }}
              >
                🎬 Sync Play/Pause
              </button>
              <button
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                ⏰ Sync Timestamp
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SidePanel;