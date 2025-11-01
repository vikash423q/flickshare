import { useState, useEffect } from "react";
import Button from '@mui/material/Button';

const StartPage = (props) => {
    const [userId, setUserId] = useState(null);

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
        <div>
        {userId ? 
        <Button variant="contained" size="medium" color="warning" onClick={handleStartParty}>Start FlickShare</Button> :
        <Button variant="contained" size="medium" color="warning" onClick={()=>props.setIsSettingUp(true)}>Setup FlickShare</Button>
        }
        </div>
    );
}

export default StartPage;