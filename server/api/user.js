import User from '../model/user.js';
import jwt from 'jsonwebtoken';
import Config from '../config.js';

const authenticate = (req, res) => {
    // Authentication logic here
    User.findOne({ token: req.body.token })
    .then(user => {
        const oneYearMs = 365 * 24 * 60 * 60 * 1000; // 365 days in milliseconds
        var token = jwt.sign({ userId: user.userId }, Config.privateKey);
        res.cookie('token', token, {expires: new Date(Date.now() + oneYearMs), secure: false, httpOnly: false});
        return res.status(200).send({ message: 'Authenticated', userId: user.userId , token: token});
        })
    .catch(err => {
        console.error('Authentication error:', err);
        return res.status(401).send({ message: 'Authentication failed' , error: err});
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