const User = require('../models/user');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';

const signToken = (id) => {
    return jwt.sign({ id }, JWT_SECRET, {
        expiresIn: JWT_EXPIRE
    });
};

// Helper function to set cookie
const sendTokenResponse = (user, statusCode, res) => {
    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
        // Removed domain setting to allow cookies to work across domains
    };

    // Remove password from output
    user.password = undefined;

    // Set the cookie
    res.cookie('jwt', token, cookieOptions);

    // Set Authorization header
    res.setHeader('Authorization', `Bearer ${token}`);

    // Send response
    res.status(statusCode).json({
        success: true,
        token,
        data: {
            user
        }
    });
};

// Forgot password controller
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
  
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
  
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'No user with that email' });
  
    const resetToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });
  
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
    const message = `Click the link to reset your password:\n\n${resetUrl}`;
  
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset',
        text: message
      });
  
      res.status(200).json({ success: true, message: 'Reset email sent' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      res.status(500).json({ success: false, message: 'Failed to send email' });
    }
  };
  
  // Reset password controller
  exports.resetPassword = async (req, res) => {
    const resetToken = req.params.token;
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
  
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });
  
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'New password is required' });
  
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
  
    res.status(200).json({ success: true, message: 'Password reset successful' });
  };

exports.register = async (req, res) => {
    try {
        console.log('Registration request body:', req.body);
        const { username, email, password, role } = req.body;

        // Validate required fields
        if (!username || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check if role is valid (only presenter or attendee can register)
        if (role === 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Cannot register as admin'
            });
        }

        // Check if email exists
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Check if username exists
        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists'
            });
        }

        console.log('Creating new user with data:', { username, email, role });
        
        // Create user
        const user = await User.create({
            username,
            email,
            password,
            role
        });

        console.log('User created successfully:', user);

        // Send token response
        sendTokenResponse(user, 201, res);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if email and password exist
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Check if user exists && password is correct
        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect email or password'
            });
        }

        // Send token response
        sendTokenResponse(user, 200, res);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.logout = (req, res) => {
    const cookieOptions = {
        expires: new Date(Date.now() + 10 * 1000), // 10 seconds
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.netlify.app' : 'localhost'
    };

    res.cookie('jwt', 'loggedout', cookieOptions);
    res.removeHeader('Authorization');
    
    res.status(200).json({ 
        success: true,
        message: 'Logged out successfully'
    });
};

exports.me = async (req, res) => {
    try {
        let token;
        if (req.cookies.jwt && req.cookies.jwt !== 'loggedout') {
            token = req.cookies.jwt;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.status(200).json({
                success: true,
                data: {
                    user,
                },
            });
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token'
                });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expired'
                });
            }
            throw error;
        }
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
}; 