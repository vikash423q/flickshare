import { useState, useEffect, StrictMode } from "react";
import Button from '@mui/material/Button';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';


const StartPage = (props) => {
    const [userId, setUserId] = useState(null);
    const [token, setToken] = useState(null);
    const [serverUrl, setServerUrl] = useState(null);
    const [userInfo, setUserInfo] = useState({});
    const [admin, setAdmin] = useState(false);
    const [currentTab, setCurrentTab] = useState(null);

    const setDataFromStorage = () => {
        const storedUserId = localStorage.getItem("userId");
        if (storedUserId) {
            setUserId(storedUserId);
        }
        const storedServerUrl = localStorage.getItem("serverUrl");
        if (storedServerUrl) {
            setServerUrl(storedServerUrl);
        } else {
            setUserId(null);
            props.setViewName('start');
        }
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
            setToken(storedToken);
        } else {
            setUserId(null);
            props.setViewName('start');
        }
    }

    const fetchUserInfo = () => {
        const res = fetch(`${serverUrl}/api/user/info`, {
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
            })
            .catch(error => {
                console.error("Error fetching user info:", error);
                setUserId(null);
            });
    }

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

    const handleStartParty = async () => {
        console.log("Starting party...");
        // Logic to start the party
        const res = await fetch(`${serverUrl}/api/rooms`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            }
        });

        const data = await res.json();
        if (res.status === 200) { 
            console.log("Party started successfully:", data);
            const roomId = data.roomId;
            localStorage.setItem("currentRoomId", roomId);
            // Switch to the side panel view
            // Wait for DOM to be ready
            togglePanel();
         }
        else {
            console.error("Failed to start party: " + data.message);
        }
    }

    const [loading, setIsLoading] = useState(false);
    const [isPanelActive, setIsPanelActive] = useState(false);

    const togglePanel = async () => {
        if (!currentTab) return;

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
            chrome.tabs.sendMessage(
                currentTab.id,
                { action: 'togglePanel' },
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

    return (
        <div>
        <div className="user-info"> 
            {userId && (admin ? <AdminPanelSettingsIcon sx={{verticalAlign: "middle", marginRight: "8px"}}/> : <AccountCircleIcon sx={{verticalAlign: "middle", marginRight: "8px"}}/> )}
        </div>
        {userId ? 
        <Button variant="contained" size="medium" color="warning" onClick={handleStartParty}>Start FlickShare</Button> :
        <Button variant="contained" size="medium" color="warning" onClick={()=>props.setViewName('setup')}>Setup FlickShare</Button>
        }
        </div>
    );
}

export default StartPage;