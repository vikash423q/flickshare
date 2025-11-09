import { useState, useEffect, useRef } from "react";
import Button from '@mui/material/Button';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Logout from '@mui/icons-material/Logout';
import IconButton from '@mui/material/IconButton';


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
        const res = fetch(`${backendUrl}/api/user/info`, {
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
        // fetch user ID from local storage
        setDataFromStorage();
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            setCurrentTab(tab);
        });
    }, []);

    useEffect(() => {
        if (userId) {
            // Get user info
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
        // Logic to start the party
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
            
            // Store roomId in chrome storage
            await chrome.storage.local.set({ roomId });
            openPanel();
            
            // Close the popup
            setTimeout(()=>window.close(), 200);
        }
        else {
            console.error("Failed to start party: " + data.message);
        }
    }

    const toWebSocketURL = (url) => {
        return url.replace(/^http(s?):\/\//, 'ws$1://');
    }

    const joinParty = async (roomId) => {
        if(!roomId) return;

        console.log("Joining party...");

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
            chrome.tabs.update(currentTab.id, {url: data.link});
            await chrome.storage.local.set({ roomId });                    
            // Wait a bit for the page to fully load
            setTimeout(() => {
                injectAndOpenPanel(currentTab.id, roomId);
            }, 500);
        }
        
        
    }

    const injectAndOpenPanel = async (tabId, roomId) => {
        try {
            // Inject content script
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ["assets/index.jsx-loader.js"]
            });

            // Wait for script to initialize
            await new Promise(resolve => setTimeout(resolve, 200));

            // Open the panel
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
        
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN){
            wsRef.current.send(JSON.stringify({
                type: 'leave',
                roomId: currentRoom,
                token
            }));
            wsRef.current.close();
        }
        
        chrome.storage.local.remove(['roomId']).then(()=>{
            setIsLoading(true);
            setCurrentRoom("");
            
            // Close panel on current tab if it's open
            if (currentTab) {
                closePanel();
            }
        });
    }

    const [loading, setIsLoading] = useState(false);
    const [isPanelActive, setIsPanelActive] = useState(false);

    const callPanelAction = async (action) => {
        if (!currentTab) return false;

        setIsLoading(true);

        try {
            // First, inject content script if not already injected
            await chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                files: ["assets/index.jsx-loader.js"]
            });

            // Wait a bit for script to initialize
            await new Promise(resolve => setTimeout(resolve, 100));

            // Send message to toggle panel
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
        callPanelAction('openPanel').then(()=>{
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
        <div className="container">
            <div className="user-info"> 
                {userId && (admin ? <AdminPanelSettingsIcon titleAccess="Admin" sx={{verticalAlign: "middle", marginRight: "8px"}}/> : <AccountCircleIcon titleAccess="User" sx={{verticalAlign: "middle", marginRight: "8px"}}/> )}
                {userId && <IconButton title="Logout" onClick={userLogout}><Logout sx={{color: "white", verticalAlign: "middle", marginRight: "8px"}}/></IconButton> }
            </div>
            {userId ? 
                ( currentRoom ? 
                    <div>
                        <div style={{ marginBottom: '10px' }}>
                            <p style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '5px' }}>
                                Room ID : {currentRoom}
                            </p>
                        </div>
                        <Button variant="contained" size="medium" color="warning" onClick={leaveParty}>Leave Party</Button>
                    </div> : 
                    <div>
                        <Button variant="contained" size="medium" color="warning" onClick={startParty}>Start New Party</Button>
                        <div style={{ marginTop: '20px', marginBottom: '10px' }}>
                            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '5px' }}>
                                Room ID
                            </label>
                            <input
                                type="text"
                                value={roomToJoin}
                                onChange={(e)=>setRoomToJoin(e.target.value)}
                                placeholder="Enter room ID"
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                        <Button 
                            variant="contained" 
                            size="small" 
                            color="warning" 
                            onClick={() => joinParty(roomToJoin)}
                        >
                            Join Party
                        </Button>
                    </div> 
                ) :
                <Button variant="contained" size="medium" color="warning" onClick={()=>props.setViewName('setup')}>Setup FlickShare</Button>
            }
        </div>
    );
}

export default StartPage;