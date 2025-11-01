import { useState, useEffect } from "react";
import Button from '@mui/material/Button';

const StartPage = (props) => {
    const [userId, setUserId] = useState(null);
    const [serverUrl, setServerUrl] = useState(null);

    useEffect(() => {
        // fetch user ID from local storage
        const storedUserId = localStorage.getItem("userId");
        if (storedUserId) {
            setUserId(storedUserId);
        }
        const storedServerUrl = localStorage.getItem("serverUrl");
        if (storedServerUrl) {
            setServerUrl(storedServerUrl);
        } else {
            setUserId(null);
        }
    }, []);

    const handleStartParty = async () => {
        console.log("Starting party...");
        // Logic to start the party
        const res = await fetch(`${httpProtocol}://${serverUrl}/api/party/start`, {
            method: "POST"
        });

      const data = await res.json();
        if (res.status === 200) {   }
        else {
            console.error("Failed to start party: " + data.message);
        }
    }

    return (
        <div>
        {userId ? 
        <Button variant="contained" size="medium" color="warning" onClick={handleStartParty}>Start FlickShare</Button> :
        <Button variant="contained" size="medium" color="warning" onClick={()=>props.setIsSettingUp(true)}>Setup FlickShare</Button>
        }
        </div>
    );
}

export default StartPage;