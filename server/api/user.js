import User from '../model/user.js';
import jwt from 'jsonwebtoken';
import Config from '../config.js';
import crypto from 'crypto';
import { generateCuteName } from '../util.js';


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
            createdAt: user.createdAt,
            name: user.name,
            gender: user.gender
        });
    })
    .catch(err => {
        return res.status(404).send({ message: 'User not found' });
    })
}

const updateUserInfo = (req, res) => {
    User.findOne({ userId: req.userId })
    .then(user => {
        if (req.body.name !== undefined) {
            user.name = req.body.name;
        }
        if (req.body.gender !== undefined) {
            user.gender = req.body.gender;
        }
        user.save()
        .then(() => {
            return res.status(200).send({ message: 'User info updated successfully' });
        })
        .catch(saveErr => {
            return res.status(500).send({ message: 'Error updating user info', error: saveErr.message });
        });
    })
    .catch(err => {
        return res.status(404).send({ message: 'User not found' });
    })
}


function generateHexToken(length = 10) {
  return crypto.randomBytes(Math.ceil(length / 2))
               .toString('hex')
               .slice(0, length);
}

const generateUserToken = (req, res) => {
    User.findOne({ userId: req.userId })
    .then(async user => {
        if (!user.admin) {
            return res.status(403).send({ message: 'Forbidden', error: 'Admin privileges required' });
        }
        let newToken = generateHexToken(Config.userTokenLength);
        let existingUser = await User.findOne({ token: newToken });
        while (existingUser) {
            newToken = generateHexToken(Config.userTokenLength);
            existingUser = await User.findOne({ token: newToken });
        }
        const name = generateCuteName();
        const newUser = new User({token: newToken, name: name, provisioned: false, admin: false});
        newUser.save()
        .then(() => {
            console.log('New user created successfully');
            return res.status(200).send({ message: 'New user created', token: newToken });
        })
        .catch(saveErr => console.error('Error creating new user:', saveErr))
    })
    .catch(err => {
        return res.status(404).send({ message: 'User not found', error: err.message });
    });
};

export { authenticate, info, updateUserInfo, generateUserToken };