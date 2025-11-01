import { useState, useEffect } from "react";
import Button from '@mui/material/Button';

import "./Setup.css";

function SetupLauncher() {
  const [userId, setUserId] = useState(null);
  const [isSettingUp, setIsSettingUp] = useState(false);

  useEffect(() => {
    // fetch user ID from local storage
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  const handleStartParty = () => {
    // Logic to start the party
  }

  return (
    <div className="setup-container">
      {userId ? 
      <Button variant="contained" color="warning" onClick={handleStartParty}>Start FlickShare</Button> :
      <Button variant="contained" color="warning" onClick={()=>setIsSettingUp(true)}>Setup FlickShare</Button>
      }
      <p className="version">FlickShare v1.0.0</p>
    </div>
  );
}

export default SetupLauncher;
