import React, { useState, useEffect, useRef } from 'react';
import getVideoController from '../content/video';
import SettingTab from './SettingTab';


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
  const [roomIdValue, setRoomIdValue] = useState("");
  const [coolDown, setCoolDown] = useState(false);
  const [playerState, setPlayerState] = useState({});

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
    gradientStart: isDarkMode ? '#db6c33' : '#ff752e',
    gradientEnd: isDarkMode ? '#5a3a32' : '#d4846f',
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
        setRoomIdValue(roomId);
      });
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

  // useEffect(()=> {
  //   const roomInfoInterval =  setInterval(()=>{
  //       if(isConnected){
  //         wsRef.current.send(JSON.stringify({
  //           actionType: 'update',
  //           type: 'room_info',
  //           roomId: roomId,
  //           token: token,
  //           userId: userId
  //         }));
  //       }
  //     }, 10000)

  //   return () => clearInterval(roomInfoInterval);
  //   }, [isConnected]);

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
        addMessage(data.userId, data.name, data.content, data.timestamp);
        break;
      case 'user_joined':
        if (data.userId !== userId) {
          addSystemMessage(`${data.name} joined`);
        }
        break;
      case 'user_left':
        addSystemMessage(`${data.name} left`);
        break;
      case 'video_state_update':
        handleVideoState(data);
        setPlayerState(data);
        break;
      case 'pong':
        const latencyMs = Date.now() - JSON.parse(data).timestamp;
        console.log(`Latency: ${latencyMs}ms`);
        break;
    }
  };

  const addMessage = (user, name, content, timestamp) => {
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
        if (data.userId !== userId) return;
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
    setShowEmojiPicker(false);
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleReconnect = () => {
    setRoomId(roomIdValue);
    setTimeout(()=>connectWebSocket(), 200);
  }

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
          e.currentTarget.style.opacity = '0.80';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.65';
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
          fontSize: '16px',
          boxShadow: 'none',
          transition: 'right 0.3s ease, opacity 0.2s ease',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          opacity: '0.8',
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
          background: `linear-gradient(135deg, ${theme.gradientStart} 0%, ${theme.gradientEnd} 100%)`,
          color: 'white',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}

        >
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
                  fontSize: '13px',
                  opacity: 0.9,
                  userSelect: 'none',
                  color: 'white',
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
              borderBottom: activeTab === 'chat' ? '2px solid #C17541' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: activeTab === 'chat' ? '#C17541' : theme.textSecondary,
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
              borderBottom: activeTab === 'sync' ? '2px solid #C17541' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: activeTab === 'sync' ? '#C17541' : theme.textSecondary,
              transition: 'all 0.2s'
            }}
          >
            ⚙️ More
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
                      value={roomIdValue}
                      onChange={(e)=>setRoomIdValue(e.target.value)}
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
                    onClick={handleReconnect}
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
                        padding: msg.type === 'system' ? '6px 8px' : '8px 12px',
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
                        marginLeft: msg.user === userId ? '32px' : '0',
                        marginRight: msg.user === userId ? '0' : '32px'
                      }}
                    >
                      {msg.type === 'message' && msg.user !== userId && (
                        <div style={{ 
                          fontSize: '11px', 
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
                        <div style={{ fontSize: '9px', marginTop: '4px', opacity: 0.7 }}>
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
                  background: theme.bg,
                  position: 'relative'
                }}>
                  {showEmojiPicker && (
                    <div style={{
                      position: 'absolute',
                      bottom: '70px',
                      left: '10px',
                      background: theme.bg,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '12px',
                      padding: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      maxHeight: '250px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      width: '220px'
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '8px'
                      }}>
                        {['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾','👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','💋','🩸'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => {
                              setInputMessage(prev => prev + emoji);
                              setShowEmojiPicker(false);
                            }}
                            style={{
                              fontSize: '20px',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = theme.hover}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      style={{
                        padding: '8px 12px',
                        background: theme.inputBg,
                        color: theme.text,
                        border: `1px solid ${theme.inputBorder}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '18px'
                      }}
                    >
                      😊
                    </button>
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: `1px solid ${theme.inputBorder}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        background: theme.inputBg,
                        color: theme.text
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            // Sync Tab
            <SettingTab theme={theme} userId={userId} name={name} backendUrl={backendUrl} token={token} setName={setName} playerState={playerState}/>
          )}
        </div>
      </div>
    </div>
  );
};

export default SidePanel;