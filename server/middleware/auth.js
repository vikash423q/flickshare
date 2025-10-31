import jwt from 'jsonwebtoken';
import Config from '../config.js';

const auth = (req, res, next) => {
    // Middleware authentication logic here
    const token = req.cookies.token;
    try {
        var decoded = jwt.verify(token, Config.privateKey, { algorithms: ['RS256'] });
        // add decoded.userId to be used later
        req.userId = decoded.userId;
    } catch(err) {
        // err
        return res.status(401).send({ message: 'Unauthorized' });
    }
    return next();
}; 

export { auth };