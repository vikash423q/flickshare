import { useState, useEffect, useRef } from "react";
import Button from '@mui/material/Button';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Logout from '@mui/icons-material/Logout';
import IconButton from '@mui/material/IconButton';
import GroupsIcon from '@mui/icons-material/Groups';
import AddIcon from '@mui/icons-material/Add';
import LoginIcon from '@mui/icons-material/Login';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const StartPage = (props) => {
    const [userId, setUserId] = useState(null);
    const [token, setToken] = useState(null);
    const [backendUrl, setbackendUrl] = useState(null);
    const [userInfo, setUserInfo] = useState({});
    const [admin, setAdmin] = useState(false);
    const [currentTab, setCurrentTab] = useState(null);
    const [currentRoom, setCurrentRoom] = useState("");
    const [roomToJoin, setRoomToJoin] = useState("");
    const [name, setName] = useState("");
    const [loading, setIsLoading] = useState(false);
    const [isPanelActive, setIsPanelActive] = useState(false);

    const wsRef = useRef(null);

    const setDataFromStorage = () => {
        chrome.storage.local.get(['userId', 'token', 'backendUrl', 'name', 'roomId'], (result) => {
            if (result.userId) {
                setUserId(result.userId);
            }
            if (result.token) {
                setToken(result.token);
            }
            if (result.name) {
                setName(result.name);
            }
            if (result.backendUrl) {
                setbackendUrl(result.backendUrl);
            } else {
                setUserId(null);
                props.setViewName('start');
            }
        });
    }

    const fetchUserInfo = () => {
        fetch(`${backendUrl}/api/user/info`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${token}`,
                }
            })
            .then(response => response.json())
            .then(data => { 
                setUserInfo(data); 
                setAdmin(data.admin);
                setName(data.name);
                chrome.storage.local.set({ name: data.name });
            })
            .catch(error => {
                console.error("Error fetching user info:", error);
                setUserId(null);
            });
    }

    useEffect(() => {
        const updateRoom = async () => {
            const { roomId } = await chrome.storage.local.get(['roomId']);
            setCurrentRoom(roomId || "");
        };

        updateRoom();
        const intervalId = setInterval(updateRoom, 1000);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        setDataFromStorage();
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            setCurrentTab(tab);
        });
    }, []);

    useEffect(() => {
        if (userId) {
            fetchUserInfo();
        }
    }, [userId]);

    useEffect(() => {
        if (userInfo.admin) {
            setAdmin(true);
        } else {
            setAdmin(false);
        }
    }, [userInfo]);

    const startParty = async () => {
        console.log("Starting party...");
        setIsLoading(true);
        
        try {
            const res = await fetch(`${backendUrl}/api/rooms`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    url: currentTab.url, 
                }),
            });

            const data = await res.json();
            if (res.status === 200) { 
                console.log("Party started successfully:", data);
                const roomId = data.roomId;
                
                await chrome.storage.local.set({ roomId });
                openPanel();
                
                setTimeout(() => window.close(), 200);
            } else {
                console.error("Failed to start party: " + data.message);
            }
        } catch (error) {
            console.error("Error starting party:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const joinParty = async (roomId) => {
        if (!roomId) return;

        console.log("Joining party...");
        setIsLoading(true);

        try {
            const res = await fetch(`${backendUrl}/api/rooms/${roomId}/info`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                }
            });

            const data = await res.json();
            if (res.status === 200) { 
                console.log("Party joined successfully:", data.link);
                
                chrome.tabs.onUpdated.addListener(async function listener(tabId, changeInfo) {
                    if (tabId === currentTab.id && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        
                        setTimeout(() => {
                            injectAndOpenPanel(currentTab.id, roomId);
                        }, 500);
                    }
                });

                await chrome.storage.local.set({ roomId });                    
                chrome.tabs.update(currentTab.id, { url: data.link });
                
                setTimeout(() => window.close(), 200);
            }
        } catch (error) {
            console.error("Error joining party:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const goToActiveParty = async () => {
        if (!currentRoom) return;

        try {
            const res = await fetch(`${backendUrl}/api/rooms/${currentRoom}/info`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                }
            });

            const data = await res.json();
            if (res.status === 200 && data.link) {
                // Check if a tab with the party link already exists
                chrome.tabs.query({}, (tabs) => {
                    const existingTab = tabs.find(tab => tab.url && tab.url.includes(data.link));
                    
                    if (existingTab) {
                        // Switch to existing tab
                        chrome.tabs.update(existingTab.id, { active: true });
                        chrome.windows.update(existingTab.windowId, { focused: true });
                    } else {
                        // Create new tab
                        chrome.tabs.create({ url: data.link, active: true });
                    }
                    
                    window.close();
                });
            }
        } catch (error) {
            console.error("Error getting party info:", error);
        }
    }

    const injectAndOpenPanel = async (tabId, roomId) => {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ["assets/index.jsx-loader.js"]
            });

            await new Promise(resolve => setTimeout(resolve, 200));

            await chrome.tabs.sendMessage(
                tabId,
                { action: 'openPanel', roomId: roomId },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error opening panel:', chrome.runtime.lastError);
                    } else {
                        console.log('Panel opened successfully:', response);
                    }
                }
            );
        } catch (error) {
            console.error('Error injecting script or opening panel:', error);
        }
    }

    const leaveParty = async () => {
        console.log("Leaving party...");
        
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'leave',
                roomId: currentRoom,
                token
            }));
            wsRef.current.close();
        }
        
        chrome.storage.local.remove(['roomId']).then(() => {
            setIsLoading(true);
            setCurrentRoom("");
            
            if (currentTab) {
                closePanel();
            }
        });
    }

    const callPanelAction = async (action) => {
        if (!currentTab) return false;

        setIsLoading(true);

        try {
            await chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                files: ["assets/index.jsx-loader.js"]
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            await chrome.tabs.sendMessage(
                currentTab.id,
                { action: action },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error:', chrome.runtime.lastError);
                    } else {
                        setIsPanelActive(response?.isActive || false);
                    }
                    setIsLoading(false);
                }
            );
        } catch (error) {
            console.error('Error injecting script:', error);
            setIsLoading(false);
        }
    };

    const openPanel = () => {
        callPanelAction('openPanel').then(() => {
            window.close();
        });
    }
    
    const closePanel = () => callPanelAction('closePanel');

    const userLogout = () => {
        chrome.storage.local.remove(['userId', 'token', 'roomId'], () => {
            props.setViewName('setup');
            if (currentTab) {
                closePanel();
            }
        });
    }

    return (
        <div style={{
            minHeight: '400px',
            background: 'linear-gradient(135deg, #db6c33 0%, #5a3a32 100%)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header with User Info */}
            {userId && (
                <div style={{
                    padding: '16px 20px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        {admin ? (
                            <AdminPanelSettingsIcon style={{ color: '#fbbf24', fontSize: '24px' }} />
                        ) : (
                            <AccountCircleIcon style={{ color: 'white', fontSize: '24px' }} />
                        )}
                        <div>
                            <div style={{
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '600'
                            }}>
                                {name || 'User'}
                            </div>
                            <div style={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontSize: '11px'
                            }}>
                                {admin ? 'Administrator' : 'Member'}
                            </div>
                        </div>
                    </div>
                    <IconButton 
                        onClick={userLogout}
                        style={{
                            color: 'white',
                            background: 'rgba(255, 255, 255, 0.1)'
                        }}
                        title="Logout"
                    >
                        <Logout />
                    </IconButton>
                </div>
            )}

            {/* Main Content */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '30px 24px'
            }}>
                {!userId ? (
                    // Not logged in state
                    <div style={{ textAlign: 'center' }}>
                        <GroupsIcon style={{
                            fontSize: '64px',
                            color: 'white',
                            marginBottom: '20px',
                            opacity: 0.9
                        }} />
                        <h2 style={{
                            color: 'white',
                            fontSize: '24px',
                            fontWeight: '600',
                            margin: '0 0 12px 0'
                        }}>
                            Welcome to FlickShare
                        </h2>
                        <p style={{
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontSize: '14px',
                            marginBottom: '24px'
                        }}>
                            Watch videos together with friends
                        </p>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={() => props.setViewName('setup')}
                            style={{
                                background: 'white',
                                color: '#db6c33',
                                fontSize: '15px',
                                fontWeight: '600',
                                padding: '12px 32px',
                                borderRadius: '25px',
                                textTransform: 'none',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                            }}
                        >
                            Setup FlickShare
                        </Button>
                    </div>
                ) : currentRoom ? (
                    // Active party state
                    <div style={{ width: '100%', maxWidth: '320px' }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            padding: '24px',
                            marginBottom: '16px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                background: 'rgba(16, 185, 129, 0.2)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                                border: '3px solid rgba(16, 185, 129, 0.5)'
                            }}>
                                <GroupsIcon style={{ fontSize: '32px', color: '#10b981' }} />
                            </div>
                            <h3 style={{
                                color: 'white',
                                fontSize: '18px',
                                fontWeight: '600',
                                margin: '0 0 8px 0'
                            }}>
                                Party Active
                            </h3>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                display: 'inline-block',
                                marginBottom: '8px'
                            }}>
                                <span style={{
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    fontSize: '11px',
                                    display: 'block'
                                }}>
                                    Room ID
                                </span>
                                <span style={{
                                    color: 'white',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    letterSpacing: '1px'
                                }}>
                                    {currentRoom}
                                </span>
                            </div>
                        </div>

                        <Button
                            variant="contained"
                            fullWidth
                            onClick={goToActiveParty}
                            startIcon={<OpenInNewIcon />}
                            style={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                color: '#db6c33',
                                fontSize: '15px',
                                fontWeight: '600',
                                padding: '12px',
                                borderRadius: '10px',
                                textTransform: 'none',
                                marginBottom: '12px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                            }}
                        >
                            Go to Party
                        </Button>

                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={leaveParty}
                            startIcon={<ExitToAppIcon />}
                            disabled={loading}
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '2px solid rgba(239, 68, 68, 0.5)',
                                color: 'white',
                                fontSize: '15px',
                                fontWeight: '600',
                                padding: '12px',
                                borderRadius: '10px',
                                textTransform: 'none'
                            }}
                        >
                            Leave Party
                        </Button>
                    </div>
                ) : (
                    // No active party state
                    <div style={{ width: '100%', maxWidth: '320px' }}>
                        <h2 style={{
                            color: 'white',
                            fontSize: '20px',
                            fontWeight: '600',
                            textAlign: 'center',
                            margin: '0 0 24px 0'
                        }}>
                            Start Watching Together
                        </h2>

                        <Button
                            variant="contained"
                            fullWidth
                            onClick={startParty}
                            disabled={loading}
                            startIcon={<AddIcon />}
                            style={{
                                background: loading ? 'rgba(255, 255, 255, 0.5)' : 'white',
                                color: loading ? 'rgba(102, 126, 234, 0.5)' : '#db6c33',
                                fontSize: '15px',
                                fontWeight: '600',
                                padding: '14px',
                                borderRadius: '12px',
                                textTransform: 'none',
                                marginBottom: '32px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                            }}
                        >
                            {loading ? 'Starting...' : 'Start New Party'}
                        </Button>

                        <div style={{
                            width: '100%',
                            height: '1px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            marginBottom: '32px',
                            position: 'relative'
                        }}>
                            <span style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                background: 'linear-gradient(135deg, #db6c33 0%, #764ba2 100%)',
                                color: 'rgba(255, 255, 255, 0.7)',
                                padding: '4px 16px',
                                fontSize: '12px',
                                fontWeight: '500'
                            }}>
                                OR
                            </span>
                        </div>

                        <div style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '12px',
                            padding: '20px'
                        }}>
                            <label style={{
                                display: 'block',
                                color: 'white',
                                fontSize: '13px',
                                fontWeight: '500',
                                marginBottom: '10px',
                                opacity: 0.9
                            }}>
                                Join Existing Party
                            </label>
                            <input
                                type="text"
                                value={roomToJoin}
                                onChange={(e) => setRoomToJoin(e.target.value)}
                                placeholder="Enter Room ID"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    border: '2px solid rgba(255, 255, 255, 0.3)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    marginBottom: '12px',
                                    transition: 'all 0.2s'
                                }}
                                onFocus={(e) => {
                                    e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                                    e.target.style.borderColor = 'white';
                                }}
                                onBlur={(e) => {
                                    e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                                }}
                            />
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={() => joinParty(roomToJoin)}
                                disabled={!roomToJoin.trim() || loading}
                                startIcon={<LoginIcon />}
                                style={{
                                    background: (!roomToJoin.trim() || loading) ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.9)',
                                    color: (!roomToJoin.trim() || loading) ? 'rgba(102, 126, 234, 0.5)' : '#db6c33',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    textTransform: 'none',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                {loading ? 'Joining...' : 'Join Party'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
            <p className="version" style={{color: 'white'}}>FlickShare v1.0.0</p>
        </div>
    );
}

export default StartPage;