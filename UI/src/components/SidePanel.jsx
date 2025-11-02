import React, { useState, useEffect, useRef } from 'react';

const SidePanel = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [userId, setUserId] = useState('');
  const [backendUrl, setbackendUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'sync'
  
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load saved user ID and room ID
    chrome.storage.local.get(['userId', 'roomId', 'name', 'backendUrl'], (result) => {
      if (result.userId) {
        setUserId(result.userId);
      }
      if (result.roomId) {
        setRoomId(result.roomId);
      }
      if (result.name) {
        setName(result.name);
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
      });
    }
  }, [roomId]);

  const toWebSocketURL = (url) => {
  return url.replace(/^http(s?):\/\//, 'ws$1://');
}

  const connectWebSocket = () => {
    if (wsRef.current) return;

    wsRef.current = new WebSocket(toWebSocketURL(backendUrl));

    wsRef.current.onopen = () => {
      setIsConnected(true);
      wsRef.current.send(JSON.stringify({
        type: 'join',
        userId,
        roomId,
        supportsVideo: false
      }));
      addSystemMessage(`Connected to room: ${roomId}`);
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      addSystemMessage('Disconnected');
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
          addSystemMessage(`${data.userId} joined`);
        }
        break;
      case 'user_left':
        addSystemMessage(`${data.userId} left`);
        break;
    }
  };

  const addMessage = (user, content, timestamp) => {
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
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
      type: 'message',
      content: inputMessage
    }));

    setInputMessage('');
  };

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
    setTimeout(() => {
      onClose();
    }, 300);
  };

  useEffect(() => {
      const video = document.querySelector('video');
      const aspect = video.clientHeight / video.clientWidth;
      if (isOpen) {
        video.style.width = (video.clientWidth - 240) + 'px';
        video.style.height = (video.clientWidth) * aspect + 'px'; 
      } else {
        video.style.width = (video.clientWidth + 240) + 'px';
        video.style.height = (video.clientWidth) * aspect + 'px'; 
      }
 
    }, [isOpen]);

  return (
    <div style={{ pointerEvents: 'all' }}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          right: isOpen ? '280px' : '0',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '40px',
          height: '80px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: isOpen ? '8px 0 0 8px' : '0',
          cursor: 'pointer',
          zIndex: 2147483646,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '20px',
          boxShadow: '-2px 0 10px rgba(0,0,0,0.2)',
          transition: 'right 0.3s ease',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        {isOpen ? '›' : '‹'}
      </button>

      {/* Side Panel */}
      <div
        style={{
          position: 'fixed',
          right: isOpen ? '0' : '-450px',
          top: '0',
          width: '280px',
          height: '100vh',
          background: 'white',
          boxShadow: '-2px 0 20px rgba(0,0,0,0.15)',
          zIndex: 2147483647,
          transition: 'right 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
              Watch Together 🎬
            </h2>
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
              Room: {roomId} • {isConnected ? '🟢 Online' : '🔴 Offline'}
            </p>
          </div>
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
              fontSize: '18px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb'
        }}>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'chat' ? 'white' : 'transparent',
              borderBottom: activeTab === 'chat' ? '2px solid #667eea' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: activeTab === 'chat' ? '#667eea' : '#6b7280'
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
              background: activeTab === 'sync' ? 'white' : 'transparent',
              borderBottom: activeTab === 'sync' ? '2px solid #667eea' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: activeTab === 'sync' ? '#667eea' : '#6b7280'
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
                <div style={{ padding: '15px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '5px' }}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '5px' }}>
                      Room ID
                    </label>
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
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
                    Connect to Room
                  </button>
                </div>
              )}

              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '15px',
                background: '#fafafa'
              }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '50px', fontSize: '14px' }}>
                    {isConnected ? 'No messages yet. Say hi! 👋' : 'Connect to start chatting'}
                  </div>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      style={{
                        marginBottom: '12px',
                        padding: msg.type === 'system' ? '8px 12px' : '10px 14px',
                        background: msg.type === 'system' ? '#fef3c7' : msg.user === userId ? '#667eea' : 'white',
                        color: msg.type === 'system' ? '#92400e' : msg.user === userId ? 'white' : '#1f2937',
                        borderRadius: '10px',
                        fontSize: '14px',
                        boxShadow: msg.type === 'system' ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
                        fontStyle: msg.type === 'system' ? 'italic' : 'normal',
                        marginLeft: msg.user === userId ? '40px' : '0',
                        marginRight: msg.user === userId ? '0' : '40px'
                      }}
                    >
                      {msg.type === 'message' && msg.user !== userId && (
                        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', opacity: 0.8 }}>
                          {msg.user}
                        </div>
                      )}
                      <div>{msg.content}</div>
                      {msg.type === 'message' && (
                        <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                          {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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
                  borderTop: '1px solid #e5e7eb',
                  background: 'white'
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
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim()}
                      style={{
                        padding: '10px 20px',
                        background: inputMessage.trim() ? '#667eea' : '#d1d5db',
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
              <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#1f2937' }}>
                Video Synchronization
              </h3>
              <div style={{
                padding: '15px',
                background: '#fef3c7',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#92400e',
                marginBottom: '15px'
              }}>
                <strong>🚧 Coming Soon</strong><br/>
                Video sync feature will allow everyone in the room to watch at the same time.
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