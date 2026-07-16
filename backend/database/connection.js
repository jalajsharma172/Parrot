import { initDb } from './db.js';
import { initScoresDb, initInvitesDb } from './scoreDb.js';

const Database__Connection = async () => {
    try {
        await initDb();
        await initScoresDb();
        await initInvitesDb();
        console.log('Database connected Successfully!! .');
    } catch (error) {
        console.error('Failed to start Database__Connection X X :', error);
    }
};

export default Database__Connection;