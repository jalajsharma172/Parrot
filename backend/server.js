//HTTP
import http from 'http';
import express from 'express';
import cors from 'cors';
import router from './routes/route.js';//File
//Socket.io 
import { Server } from 'socket.io';
import { handleSocketConnections } from './socket/socketHandler.js';
//DatabaseConnection fetech
import Database__Connection from './database/connection.js'
//Private Key
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const cors__origin = process.env.CORS_ORIGIN || '*';
const PORT = process.env.PORT || 3000;



const app = express();

//CORS for Server safty
app.use(cors({
  origin: cors__origin
}));
app.use(express.json());

// Serve static assets from public folder (avatars, etc)
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

//  Socket.io with CORS for Server Safety
const io = new Server(server, {
  cors: {
    origin: cors__origin
  }
});
// io handle everything in
handleSocketConnections(io);

// This is only create for Uptime Platform
app.get('/', (req, res) => {
  res.status(200).json({ status: true });
});

app.use('/api', router);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  Database__Connection();
});
// Now the HTTP server is running both Express and Socket.IO. that's why we didn't used -app.listen()
