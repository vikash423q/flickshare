import { useState, useEffect } from "react";
import Button from '@mui/material/Button';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Link from '@mui/material/Link';
import UsersPage from "./UsersPage";
import SetupPage from "./SetupPage"

const StartPage = (props) => {
    const [userId, setUserId] = useState(null);
    const [token, setToken] = useState(null);
    const [serverUrl, setServerUrl] = useState(null);
    const [userInfo, setUserInfo] = useState({});
    const [admin, setAdmin] = useState(false);

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
        const res = await fetch(`${serverUrl}/api/party/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            }
        });

      const data = await res.json();
        if (res.status === 200) {   }
        else {
            console.error("Failed to start party: " + data.message);
        }
    }

    return (
        <div>
        <div className="user-info"> 
            {userId && (admin ? <AdminPanelSettingsIcon sx={{verticalAlign: "middle", marginRight: "8px"}}/> : <AccountCircleIcon sx={{verticalAlign: "middle", marginRight: "8px"}}/> )}
        </div>
        {userId ? 
        <Button variant="contained" size="medium" color="warning" onClick={handleStartParty}>Start FlickShare</Button> :
        <Button variant="contained" size="medium" color="warning" onClick={()=>props.setViewName('setup')}>Setup FlickShare</Button>
        }

        {/* Links for both admin & normal user */}
{userId && (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      gap: "20px",
      marginTop: "15px"
      
    }}
  >
    {/* Only admin sees "Users" */}
    {admin && (
      <Link
        href="#"
        underline="always"
        color="inherit"
       onClick={() => props.setViewName('UsersPage')}
        sx={{ cursor: "pointer" , fontWeight: "bold" }}
      >
        Users
      </Link>
    )}

    {/* common links */}
    <Link
      href="#"
      underline="always"
      color="inherit"
      onClick={() => props.setViewName('setup')}
      sx={{ cursor: "pointer", fontWeight: "bold" }}
    >
      Settings
    </Link>

    <Link
      href="#"
      underline="always"
      color="inherit"
      onClick={() => props.setViewName('help')}
      sx={{ cursor: "pointer", fontWeight: "bold" }}
    >
      Help
    </Link>
  </div>
)}
  </div>
);
        
}

export default StartPage;