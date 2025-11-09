import { useState } from "react";
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HttpsIcon from '@mui/icons-material/Https';
import HttpIcon from '@mui/icons-material/Http';
import KeyIcon from '@mui/icons-material/Key';
import StorageIcon from '@mui/icons-material/Storage';

function SetupPage(props) {
    const [useHttps, setUseHttps] = useState(true);
    const [backendUrl, setbackendUrl] = useState("flickshare.vikashgaurav.com");
    const [password, setPassword] = useState("supersecrettoken123");
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState("");

    const handleConnect = async () => {
        setIsConnecting(true);
        setError("");
        
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
            
            if (res.status === 200) {
                chrome.storage.local.set({ 
                    backendUrl: `${httpProtocol}://${backendUrl}`, 
                    userId: data.userId, 
                    name: data.name, 
                    token: data.token 
                });
                props.setViewName('start');
            } else {
                setError(data.message || "Authentication failed");
            }
        } catch (error) {
            console.error(error);
            setError("Failed to connect to server. Please check your URL.");
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div style={{
            minHeight: '400px',
            minWidth: '300px',
            background: 'linear-gradient(135deg, #db6c33 0%, #5a3a32 100%)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Back Button */}
            <div style={{ 
                position: 'absolute', 
                top: '12px', 
                left: '12px',
                zIndex: 10
            }}>
                <IconButton 
                    onClick={() => props.setViewName('start')}
                    style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white'
                    }}
                >
                    <ArrowBackIcon />
                </IconButton>
            </div>

            {/* Main Content */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '30px 20px 20px'
            }}>
                {/* Logo/Title */}
                <div style={{
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    <h2 style={{
                        color: 'white',
                        fontSize: '28px',
                        fontWeight: '600',
                        margin: 0,
                        marginBottom: '8px'
                    }}>
                        🎬 FlickShare
                    </h2>
                    <p style={{
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: '14px',
                        margin: 0
                    }}>
                        Connect to your server
                    </p>
                </div>

                {/* Form Container */}
                <div style={{
                    width: '100%',
                    maxWidth: '320px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}>
                    {/* Protocol Toggle */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '500',
                            marginBottom: '8px',
                            opacity: 0.9
                        }}>
                            Protocol
                        </label>
                        <div style={{
                            display: 'flex',
                            gap: '8px'
                        }}>
                            <button
                                onClick={() => setUseHttps(true)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: useHttps ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                                    border: useHttps ? '2px solid white' : '2px solid transparent',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <HttpsIcon style={{ fontSize: '18px' }} />
                                HTTPS
                            </button>
                            <button
                                onClick={() => setUseHttps(false)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: !useHttps ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                                    border: !useHttps ? '2px solid white' : '2px solid transparent',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <HttpIcon style={{ fontSize: '18px' }} />
                                HTTP
                            </button>
                        </div>
                    </div>

                    {/* Server URL Input */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '500',
                            marginBottom: '8px',
                            opacity: 0.9
                        }}>
                            <StorageIcon style={{ 
                                fontSize: '14px', 
                                verticalAlign: 'middle', 
                                marginRight: '4px' 
                            }} />
                            Server URL
                        </label>
                        <input
                            type="text"
                            value={backendUrl}
                            onChange={(e) => setbackendUrl(e.target.value)}
                            placeholder="example.com"
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
                    </div>

                    {/* Token Input */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '500',
                            marginBottom: '8px',
                            opacity: 0.9
                        }}>
                            <KeyIcon style={{ 
                                fontSize: '14px', 
                                verticalAlign: 'middle', 
                                marginRight: '4px' 
                            }} />
                            Authentication Token
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your token"
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
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            padding: '10px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.5)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '13px',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Connect Button */}
                    <Button
                        onClick={handleConnect}
                        disabled={isConnecting || !backendUrl || !password}
                        variant="contained"
                        fullWidth
                        style={{
                            padding: '12px',
                            background: isConnecting ? 'rgba(255, 255, 255, 0.3)' : 'white',
                            color: isConnecting ? 'rgba(102, 126, 234, 0.5)' : '#db6c33',
                            fontSize: '15px',
                            fontWeight: '600',
                            borderRadius: '8px',
                            textTransform: 'none',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {isConnecting ? 'Connecting...' : 'Connect to Server'}
                    </Button>
                </div>

                {/* Footer Text */}
                <p className="version" style={{color: 'white'}}>FlickShare v1.0.0</p>
            </div>
        </div>
    );
}

export default SetupPage;