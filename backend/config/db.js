const mongoose = require('mongoose');
const User = require('../models/User');
const Paper = require('../models/Paper');

const connectWithRetry = async () => {
    try {
        await mongoose.connect('mongodb+srv://dbUser:GwWt9zrVEgItoOjU@cluster0.j3lma.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');
        
        // Ensure indexes are created for User model
        await User.collection.dropIndexes();
        await User.syncIndexes();
        console.log('User indexes synchronized');

        // Ensure indexes are created for Paper model
        await Paper.collection.dropIndexes();
        await Paper.syncIndexes();
        console.log('Paper indexes synchronized');
        
        // Reset database and create admin if needed
        await resetDatabase();
    } catch (err) {
        console.error('MongoDB connection error:', err);
        console.log('Retrying in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
    }
};

const resetDatabase = async () => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        
        if (!adminExists) {
            await User.create({
                username: 'admin',
                email: 'admin@example.com',
                password: 'admin123',
                role: 'admin'
            });
            console.log('Admin user created');
        }
    } catch (error) {
        console.error('Error resetting database:', error);
        throw error;
    }
};

module.exports = { connectWithRetry }; 