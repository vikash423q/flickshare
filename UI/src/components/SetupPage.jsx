import { useState } from "react";
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import "../Setup.css";

function SetupPage(props) {
    const [useHttps, setUseHttps] = useState(true);
    const [backendUrl, setbackendUrl] = useState("flickshare.vikashgaurav.com");
    const [password, setPassword] = useState("supersecrettoken123");

    const handleConnect = async () => {
    try {
      const httpProtocol = useHttps ? "https" : "http";
      const res = await fetch(`${httpProtocol}://${backendUrl}/api/user/authenticate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: password,
        }),
      });

      const data = await res.json();
      // On successful authentication, store userId in chrome.storage
      if (res.status === 200) {
        chrome.storage.local.set({ backendUrl: `${httpProtocol}://${backendUrl}`, userId: data.userId, name: data.name, token: data.token });
        props.setViewName('start');
      } else {
        console.error("Authentication failed: " + data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

    return (
      <>
        <div className="back-button">
            <IconButton onClick={() => props.setViewName('start')}><ArrowBackIcon sx={{color: "white"}}/></IconButton>
        </div>

        <div className="setup-container container">

            <h2 className="setup-heading">Setup FlickShare</h2>

            <div className="row">
                <label className="input-label">Server URL</label>
                <input
                    className="setup-input"
                    type="text"
                    value={backendUrl}
                    onChange={(e) => setbackendUrl(e.target.value)}
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
