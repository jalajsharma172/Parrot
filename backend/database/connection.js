import mongoose from 'mongoose';
import { initDb } from './db.js';
import { initScoresDb, initInvitesDb } from './scoreDb.js';

const Database__Connection = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/parrot';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB database Successfully!!');
        
        await initDb();
        await initScoresDb();
        await initInvitesDb();
    } catch (error) {
        console.error('Failed to connect to MongoDB Database__Connection X X :', error);
    }
};

export default Database__Connection;