const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public')); // Serve static files (HTML, CSS, JS)

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle receiving a message
    socket.on('chat message', (msg) => {
        console.log('Message:', msg);
        io.emit('chat message', msg); // Broadcast to all clients
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
