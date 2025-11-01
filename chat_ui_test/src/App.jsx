import React, { useState, useEffect, useRef } from 'react';

// Individual Chat Window Component
const ChatWindow = ({ userId, roomId, position, onDrag, serverUrl}) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  const onOpen = () => {
      setIsConnected(true);
      // Join room
      wsRef.current.send(JSON.stringify({
        type: 'join',
        userId,
        roomId,
        supportsVideo: false
      }));
    };

  const onMessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'joined':
        addMessage('system', `Connected to ${roomId}`);
        break;
      case 'message':
        addMessage(data.userId, data.content, data.timestamp);
        break;
      case 'user_joined':
        if (data.userId !== userId) {
          addMessage('system', `${data.userId} joined`);
        }
        break;
      case 'user_left':
        addMessage('system', `${data.userId} left`);
        break;
    }
  };

  const onClose = () => {
    setIsConnected(false);
    addMessage('system', 'Disconnected');
  };

  const onError = (error) => {
    console.error('WebSocket error:', error);
  };

  const establishConnection = () => {
    wsRef.current = new WebSocket(serverUrl);
    wsRef.current.onopen = onOpen;
    wsRef.current.onmessage = onMessage;
    wsRef.current.onclose = onClose;
    wsRef.current.onerror = onError;
  }

  useEffect(() => {
    // Connect to WebSocket
    establishConnection();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [userId, roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (user, content, timestamp) => {
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      user,
      content,
      timestamp: timestamp || Date.now()
    }]);
  };

  const restablishConnection = () => {
    if (isConnected) return;
    establishConnection();
  }

  const sendMessage = () => {
    if (!input.trim() || !isConnected) return;

    wsRef.current.send(JSON.stringify({
      type: 'message',
      content: input
    }));

    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getColor = () => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '280px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 1000,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
      draggable
      onDrag={onDrag}
    >
      {/* Header */}
      <div
        style={{
          background: getColor(),
          color: 'white',
          padding: '12px 15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'move',
          userSelect: 'none'
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '600' }}>{userId}</div>
          <div style={{ fontSize: '11px', opacity: 0.9 }}>
            {roomId} • {isConnected ? '🟢' : '🔴'}
          </div>
        </div>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isMinimized ? '□' : '−'}
        </button>
      </div>

      {/* Messages Area */}
      {!isMinimized && (
        <>
          <div
            style={{
              flex: 1,
              overflowY: 'scroll',
              padding: '12px',
              background: '#f9fafb',
              minHeight: '300px',
              maxHeight: '300px'
            }}
          >
            {messages.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#9ca3af', 
                fontSize: '13px',
                marginTop: '50px'
              }}>
                No messages yet
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    marginBottom: '10px',
                    padding: msg.user === 'system' ? '6px 10px' : '8px 12px',
                    background: msg.user === 'system' 
                      ? '#fef3c7' 
                      : msg.user === userId 
                        ? getColor()
                        : 'white',
                    color: msg.user === 'system'
                      ? '#92400e'
                      : msg.user === userId
                        ? 'white'
                        : '#1f2937',
                    borderRadius: '8px',
                    fontSize: '13px',
                    wordWrap: 'break-word',
                    boxShadow: msg.user !== 'system' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    fontStyle: msg.user === 'system' ? 'italic' : 'normal',
                    marginLeft: msg.user === userId ? '20px' : '0',
                    marginRight: msg.user === userId ? '0' : '20px'
                  }}
                >
                  {msg.user !== 'system' && msg.user !== userId && (
                    <div style={{ 
                      fontSize: '11px', 
                      fontWeight: '600',
                      marginBottom: '3px',
                      opacity: 0.8
                    }}>
                      {msg.user}
                    </div>
                  )}
                  <div>{msg.content}</div>
                  {msg.user !== 'system' && (
                    <div style={{ 
                      fontSize: '10px', 
                      marginTop: '3px',
                      opacity: 0.7
                    }}>
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

          {/* Input Area */}
          <div style={{ 
            padding: '12px',
            borderTop: '1px solid #e5e7eb',
            background: 'white'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={restablishConnection}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: isConnected ? '#111827' : '#9ca3af',
                  outline: 'none',
                  background: isConnected ? 'white' : '#f3f4f6'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || !isConnected}
                style={{
                  padding: '8px 14px',
                  background: (input.trim() && isConnected) ? getColor() : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (input.trim() && isConnected) ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Main App Component
const App = () => {
  const [windows, setWindows] = useState([
    { id: 1, userId: 'Alice', roomId: 'room-1', position: { x: 50, y: 50 } },
    { id: 2, userId: 'Bob', roomId: 'room-1', position: { x: 380, y: 50 } },
    { id: 3, userId: 'Charlie', roomId: 'room-1', position: { x: 710, y: 50 } },
    { id: 4, userId: 'Vika', roomId: 'room-2', position: { x: 1020, y: 50 } },
    { id: 5, userId: 'Robbi', roomId: 'room-2', position: { x: 380, y: 500 } },
    { id: 6, userId: 'Maggie', roomId: 'room-2', position: { x: 710, y: 500 } },
  ]);

  const [newUserId, setNewUserId] = useState('');
  const [newRoomId, setNewRoomId] = useState('room-1');
  const [serverUrl, setServerUrl] = useState('wss://flickshare.vikashgaurav.com');

  const changePosition = (id, newPos) => {
    setWindows(windows.map(w => 
      w.id === id ? { ...w, position: newPos } : w
    ));
  };

  const dragWindow = (e, id) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;

    const window = windows.find(w => w.id === id);
    if (!window) return;

    const origX = window.position.x;
    const origY = window.position.y;

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - origX;
      const deltaY = moveEvent.clientY - origY;
      changePosition(id, { x: origX + deltaX, y: origY + deltaY });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const addWindow = () => {
    if (!newUserId.trim()) {
      alert('Please enter a user ID');
      return;
    }

    const newWindow = {
      id: Date.now(),
      userId: newUserId.trim(),
      roomId: newRoomId.trim(),
      position: { 
        x: 50 + (windows.length * 30) % 800, 
        y: 50 + (windows.length * 30) % 400 
      }
    };

    setWindows([...windows, newWindow]);
    setNewUserId('');
  };

  const removeWindow = (id) => {
    setWindows(windows.filter(w => w.id !== id));
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative'
    }}>
      {/* Control Panel */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'white',
        padding: '10px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        width: '280px',
        zIndex: 2000,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#1f2937' }}>
          Chat Testing Panel
        </h2>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '13px', 
            fontWeight: '500',
            marginBottom: '6px',
            color: '#4b5563'
          }}>
            Server URL
          </label>
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addWindow()}
            placeholder="Enter server URL"
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '13px', 
            fontWeight: '500',
            marginBottom: '6px',
            color: '#4b5563'
          }}>
            User ID
          </label>
          <input
            type="text"
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addWindow()}
            placeholder="Enter user ID"
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '13px', 
            fontWeight: '500',
            marginBottom: '6px',
            color: '#4b5563'
          }}>
            Room ID
          </label>
          <input
            type="text"
            value={newRoomId}
            onChange={(e) => setNewRoomId(e.target.value)}
            placeholder="Enter room ID"
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <button
          onClick={addWindow}
          style={{
            width: '100%',
            padding: '10px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            marginBottom: '15px'
          }}
        >
          + Add Chat Window
        </button>

        <div style={{ 
          paddingTop: '15px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280',
            marginBottom: '10px',
            fontWeight: '500'
          }}>
            Active Windows: {windows.length}
          </div>
          
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {windows.map(w => (
              <div
                key={w.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  background: '#f9fafb',
                  borderRadius: '6px',
                  marginBottom: '6px',
                  fontSize: '12px'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: '#1f2937' }}>{w.userId}</div>
                  <div style={{ color: '#6b7280', fontSize: '11px' }}>{w.roomId}</div>
                </div>
                <button
                  onClick={() => removeWindow(w.id)}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          marginTop: '15px',
          padding: '12px',
          background: '#fef3c7',
          borderRadius: '6px',
          fontSize: '11px',
          color: '#92400e',
          lineHeight: '1.5'
        }}>
          <strong>💡 Tip:</strong> Open multiple windows with different users but same room ID to test real-time chat synchronization.
        </div>
      </div>

      {/* Chat Windows */}
      {windows.map(window => (
        <ChatWindow
          key={window.id}
          userId={window.userId}
          roomId={window.roomId}
          position={window.position}
          onDrag={(e) => dragWindow(e, window.id)}
          serverUrl={serverUrl}
        />
      ))}

      {/* Instructions Overlay */}
      {windows.length === 0 && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'white',
          fontSize: '18px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>💬</div>
          <div style={{ fontWeight: '600', marginBottom: '10px' }}>
            No chat windows open
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            Use the control panel to add chat windows
          </div>
        </div>
      )}
    </div>
  );
};

export default App;