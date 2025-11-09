import { getPartyLink } from '../websocket.js';

const redirectToParty = async (req, res) => {
    const { roomId } = req.params;
    const { token } = req.query;

    // Validate token if needed
    if (!token) {
        return res.status(401).json({ 
            status: 'error', 
            message: 'Authentication token required' 
        });
    }

    try {
        // Verify token (optional but recommended)
        // const decoded = jwt.verify(token, Config.privateKey);
        
        const partyRes = await getPartyLink(roomId);

        if (partyRes.status === 'error') {
            return res.status(404).json({ 
                status: 'error', 
                message: partyRes.message || 'Room not found' 
            });
        }

        // Check if link exists
        if (!partyRes.link || partyRes.link === '') {
            return res.status(400).json({ 
                status: 'error', 
                message: 'No video link set for this room. Please add a video link first.' 
            });
        }

        // Redirect to the party video link
        return res.redirect(partyRes.link);

    } catch (error) {
        console.error('Error redirecting to party:', error);
        return res.status(500).json({ 
            status: 'error', 
            message: 'Internal server error',
            details: error.message 
        });
    }
}

export { redirectToParty };