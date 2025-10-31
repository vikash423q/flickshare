import User from '../model/user.js';
import jwt from 'jsonwebtoken';

const authenticate = (req, res) => {
    // Authentication logic here
    User.findOne({ token: req.body.token })
    .then(user => {
        const oneYearMs = 365 * 24 * 60 * 60 * 1000; // 365 days in milliseconds
        var token = jwt.sign({ userId: user.userId }, Config.privateKey, { algorithm: 'RS256' });
        res.cookie('token', token, {expires: new Date(Date.now() + oneYearMs), secure: true, httpOnly: true});
        return res.status(200).send({ message: 'Authenticated', userId: user.userId });
        })
    .catch(err => {
        return res.status(401).send({ message: 'Authentication failed' });
    });

};


// Retrieve user info from authorized request
const info = (req, res) => {
    // User info retrieval logic here
    User.findOne({ userId: req.userId })
    .then(user => {
        return res.status(200).send({ 
            userId: user.userId,
            provisioned: user.provisioned,
            admin: user.admin,
            createdAt: user.createdAt
        });
    })
    .catch(err => {
        return res.status(404).send({ message: 'User not found' });
    })
}

export { authenticate, info };