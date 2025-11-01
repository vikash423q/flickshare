import { useState } from "react";
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import "../Setup.css";

function SetupPage(props) {
    const [useHttps, setUseHttps] = useState(true);
    const [serverUrl, setServerUrl] = useState("");
    const [password, setPassword] = useState("");

    const handleConnect = async () => {
    try {
      const httpProtocol = useHttps ? "https" : "http";
      const res = await fetch(`${httpProtocol}://${serverUrl}/api/user/authenticate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: password,
        }),
      });

      const data = await res.json();
      // On successful authentication, store userId in localStorage
      if (res.status === 200) {
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("serverUrl", `${httpProtocol}://${serverUrl}`);
        props.setIsSettingUp(false);
        document.cookie = res.cookie;
      } else {
        console.error("Authentication failed: " + data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };


    // ✅ Generate Token Function
    const handleGenerateToken = () => {
        const newToken = Math.random().toString(36).substr(2, 12); // random 12-char token
        setPassword(newToken);
    };

    return (
      <>
        <div className="back-button">
            <IconButton onClick={() => props.setIsSettingUp(false)}><ArrowBackIcon sx={{color: "white"}}/></IconButton>
        </div>

        <div className="setup-container">

            <h2 className="setup-heading">Setup FlickShare</h2>

            <div className="row">
                <label className="input-label">Server URL</label>
                <input
                    className="setup-input"
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                />
            </div>

            <div className="row">
                <label className="input-label">Token</label>
                <input
                    className="setup-input"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>

            <Button onClick={handleConnect} size="medium" variant="contained" color="warning">
                Connect
            </Button>
        </div>
      </>
    );
}

export default SetupPage;
