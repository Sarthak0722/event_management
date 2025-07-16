const jwt = require('jsonwebtoken');
const User = require('../models/user');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

exports.protect = async (req, res, next) => {
    try {
        let token;
        
        // First check cookies
        if (req.cookies && req.cookies.jwt && req.cookies.jwt !== 'loggedout') {
            console.log('Found token in cookies');
            token = req.cookies.jwt;
        }
        // Then check Authorization header
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            console.log('Found token in Authorization header');
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            console.log('No token found');
            return res.status(401).json({ 
                success: false,
                message: 'Please log in to access this resource',
                error: 'NO_TOKEN'
            });
        }

        try {
            // Verify token
            console.log('Verifying token with secret:', JWT_SECRET.substring(0, 5) + '...');
            const decoded = jwt.verify(token, JWT_SECRET);
            console.log('Token decoded successfully:', decoded);
            
            // Check if user still exists
            const user = await User.findById(decoded.id).select('-password');
            
            if (!user) {
                console.log('User not found for token');
                return res.status(401).json({ 
                    success: false,
                    message: 'The user belonging to this token no longer exists',
                    error: 'USER_NOT_FOUND'
                });
            }

            // Check if user changed password after token was issued
            if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
                console.log('Password changed after token issued');
                return res.status(401).json({ 
                    success: false,
                    message: 'User recently changed password. Please log in again',
                    error: 'PASSWORD_CHANGED'
                });
            }

            // Add user to request
            req.user = user;
            next();
        } catch (error) {
            console.log('Token verification error:', error.name, error.message);
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    success: false,
                    message: 'Invalid token. Please log in again',
                    error: 'INVALID_TOKEN',
                    details: error.message
                });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    success: false,
                    message: 'Your token has expired. Please log in again',
                    error: 'TOKEN_EXPIRED'
                });
            }
            throw error;
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ 
            success: false,
            message: 'An error occurred while authenticating. Please try again',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
}; 