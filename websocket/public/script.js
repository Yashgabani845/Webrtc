const socket = io();

// DOM elements
const form = document.getElementById('chat-form');
const messageInput = document.getElementById('message');
const messagesDiv = document.getElementById('messages');

// Send message to server
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = messageInput.value;
    if (msg.trim() !== '') {
        socket.emit('chat message', msg);
        messageInput.value = '';
        messageInput.focus();
    }
});

// Receive message from server
socket.on('chat message', (msg) => {
    const div = document.createElement('div');
    div.textContent = msg;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});
