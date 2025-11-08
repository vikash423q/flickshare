import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/EditTwoTone';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { useState } from 'react';

const SettingTab = ({ theme, name, backendUrl, token, setName, playerState }) => {
    const [newName, setNewName] = useState('');
    const [nameChangeEnable, setNameChangeEnable] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState('');

    const handleNameChange = async () => {
        if (!newName.trim()) {
            setMessage('Please enter a name');
            return;
        }

        setIsUpdating(true);
        setMessage('');

        try {
            const response = await fetch(`${backendUrl}/api/user/info`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ name: newName }),
            });

            if (response.ok) {
                setMessage('Name updated successfully!');
                setName(newName);
                setNewName('');
                setTimeout(() => {
                    setNameChangeEnable(false);
                    setMessage('');
                }, 1500);
            } else {
                setMessage('Failed to update name');
            }
        } catch (error) {
            setMessage('Error updating name');
            console.error('Error:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCancel = () => {
        setNameChangeEnable(false);
        setNewName('');
        setMessage('');
    };

    const handleEditClick = () => {
        setNameChangeEnable(true);
        setNewName(name || '');
    };

    const formatTime = (seconds) => {
        if (!seconds || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getProgress = () => {
        if (!playerState?.duration || playerState.duration <= 0) return 0;
        return (playerState.currentTime / playerState.duration) * 100;
    };

    return (
        <div style={{ padding: '20px' }}>
            {/* Current User Display */}
            <div style={{
                padding: '18px',
                background: `linear-gradient(135deg, ${theme.systemBg} 0%, ${theme.systemBg}dd 100%)`,
                borderRadius: '10px',
                marginBottom: '25px',
                border: `1px solid ${theme.systemBg}`,
                overflow: 'hidden'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: nameChangeEnable ? '15px' : '0'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: 'white',
                        flexShrink: 0
                    }}>
                        {name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontSize: '12px',
                            color: theme.systemText,
                            marginBottom: '4px',
                            opacity: 0.7
                        }}>
                            Current User
                        </div>
                        <div style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: theme.text
                        }}>
                            {name || 'Anonymous'}
                        </div>
                    </div>
                    {!nameChangeEnable && (
                        <div>
                            <IconButton 
                                title="Edit Name" 
                                onClick={handleEditClick}
                                style={{ color: theme.text, fontSize: "24px"}}
                            >
                                <EditIcon />
                            </IconButton>
                        </div>
                    )}
                </div>

                {/* Change Username Section - Inline */}
                {nameChangeEnable && (
                    <div style={{
                        paddingTop: '15px',
                        borderTop: `1px solid ${theme.systemBg}88`,
                        animation: 'slideDown 0.2s ease-out'
                    }}>
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            marginBottom: '10px'
                        }}>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Enter new name"
                                autoFocus
                                disabled={isUpdating}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    background: theme.background || '#ffffff',
                                    border: `1px solid ${theme.systemBg}`,
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    boxSizing: 'border-box',
                                    outline: 'none'
                                }}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !isUpdating) {
                                        handleNameChange();
                                    }
                                }}
                            />
                            <IconButton
                                onClick={handleNameChange}
                                disabled={isUpdating}
                                title="Save"
                                style={{
                                    background: '#10b981',
                                    color: 'white',
                                    width: '40px',
                                    height: '40px',
                                    opacity: isUpdating ? 0.5 : 1
                                }}
                            >
                                <CheckIcon />
                            </IconButton>
                            <IconButton
                                onClick={handleCancel}
                                disabled={isUpdating}
                                title="Cancel"
                                style={{
                                    background: '#ef4444',
                                    color: 'white',
                                    width: '40px',
                                    height: '40px',
                                    opacity: isUpdating ? 0.5 : 1
                                }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </div>
                        {message && (
                            <div style={{
                                padding: '8px 12px',
                                background: message.includes('success') ? '#10b98120' : '#ef444420',
                                color: message.includes('success') ? '#10b981' : '#ef4444',
                                borderRadius: '6px',
                                fontSize: '13px'
                            }}>
                                {message}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Room Player State */}
            <div style={{
                padding: '18px',
                background: `linear-gradient(135deg, ${theme.systemBg} 0%, ${theme.systemBg}dd 100%)`,
                borderRadius: '10px',
                marginBottom: '25px',
                border: `1px solid ${theme.systemBg}`,
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '12px'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: playerState?.active 
                            ? (playerState?.isPlaying 
                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)')
                            : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        flexShrink: 0,
                        animation: playerState?.isPlaying ? 'pulse 2s ease-in-out infinite' : 'none'
                    }}>
                        {playerState?.isPlaying ? (
                            <PlayArrowIcon style={{ fontSize: '24px' }} />
                        ) : (
                            <PauseIcon style={{ fontSize: '24px' }} />
                        )}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontSize: '12px',
                            color: theme.systemText,
                            marginBottom: '4px',
                            opacity: 0.7
                        }}>
                            Room Player
                        </div>
                        <div style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: theme.text
                        }}>
                            {playerState?.active 
                                ? (playerState?.isPlaying ? 'Playing' : 'Paused')
                                : 'Inactive'}
                        </div>
                    </div>
                    <div style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: theme.text
                    }}>
                        {formatTime(playerState?.currentTime)} / {formatTime(playerState?.duration)}
                    </div>
                </div>

                {/* Progress Bar */}
                <div style={{
                    width: '100%',
                    height: '6px',
                    background: theme.background || '#e5e7eb',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    <div style={{
                        height: '100%',
                        width: `${getProgress()}%`,
                        background: playerState?.isPlaying 
                            ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                            : 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                        transition: 'width 0.3s ease',
                        borderRadius: '3px'
                    }} />
                </div>

                {playerState?.updatedBy && (
                    <div style={{
                        marginTop: '10px',
                        fontSize: '11px',
                        color: theme.systemText,
                        opacity: 0.6,
                        textAlign: 'right'
                    }}>
                        Last updated by {playerState.updatedBy}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.05);
                        opacity: 0.9;
                    }
                }
            `}</style>

            <h3 style={{ fontSize: '16px', marginBottom: '15px', color: theme.text }}>
                Video Call
            </h3>
            <div style={{
                padding: '15px',
                background: theme.systemBg,
                borderRadius: '8px',
                fontSize: '13px',
                color: theme.systemText,
                marginBottom: '15px'
            }}>
                <strong>🚧 Coming Soon</strong><br/>
                Video call feature will allow everyone in the room to watch at the same time.
            </div>
            <button
                style={{
                    width: '100%',
                    padding: '12px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    marginBottom: '10px'
                }}
            >
                🎬 Sync Play/Pause
            </button>
            <button
                style={{
                    width: '100%',
                    padding: '12px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                }}
            >
                ⏰ Sync Timestamp
            </button>
        </div>
    );
}

export default SettingTab;