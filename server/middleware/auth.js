import jwt from 'jsonwebtoken';
import Config from '../config.js';

const auth = (req, res, next) => {
    // Middleware authentication logic here
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
        var decoded = jwt.verify(token, Config.privateKey);
        // add decoded.userId to be used later
        req.userId = decoded.userId;
        req.userName = decoded.userName;
    } catch(err) {
        // err
        return res.status(401).send({ message: 'Unauthorized' });
    }
    return next();
};

export { auth };