import { useState } from "react";
import "./Setup.css";

function SetupPage() {
    const [serverUrl, setServerUrl] = useState("");
    const [password, setPassword] = useState("");

    const handleConnect = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverUrl,
          token: password,
        }),
      });

      const data = await res.json();
      alert(data.message);
    } catch (error) {
      alert("Error connecting to server");
      console.error(error);
    }
  };


    // ✅ Generate Token Function
    const handleGenerateToken = () => {
        const newToken = Math.random().toString(36).substr(2, 12); // random 12-char token
        setPassword(newToken);
    };

    return (
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

            <button className="setup-btn" onClick={handleConnect}>
                Connect
            </button>

            {/* ✅ New Button */}
            <button className="setup-btn generate-btn" onClick={handleGenerateToken}>
                Generate Token
            </button>

            <p className="version">FlickShare v1.0.0</p>
        </div>
    );
}

export default SetupPage;
