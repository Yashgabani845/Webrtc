const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static('public'));

const users = new Map();
const readyUsers = new Set(); 

io.on('connection', (socket) => {
    console.log(`New user connected: ${socket.id}`);
    users.set(socket.id, {
        id: socket.id,
        username: `User_${socket.id.substr(0, 5)}`
    });
    io.emit('userList', Array.from(users.values()));
    socket.on('ready', () => {
        readyUsers.add(socket.id);
        console.log(`User ${socket.id} is ready to connect`);
    });
    socket.on('offer', (data) => {
        console.log(`Offer from ${socket.id} to ${data.to}`);
        socket.to(data.to).emit('offer', {
            from: socket.id,
            offer: data.offer
        });
    });
    socket.on('answer', (data) => {
        console.log(`Answer from ${socket.id} to ${data.to}`);
        socket.to(data.to).emit('answer', {
            from: socket.id,
            answer: data.answer
        });
    });
    socket.on('candidate', (data) => {
        console.log(`ICE Candidate from ${socket.id} to ${data.to}`);
        socket.to(data.to).emit('candidate', {
            from: socket.id,
            candidate: data.candidate
        });
    });
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        users.delete(socket.id);
        readyUsers.delete(socket.id);
        io.emit('userList', Array.from(users.values()));
    });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Signaling server running on http://localhost:${PORT}`);
});