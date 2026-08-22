const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    const publicPath = path.join(__dirname, 'public', 'index.html');
    const rootPath = path.join(__dirname, 'index.html');
    
    res.sendFile(publicPath, (err) => {
        if (err) {
            res.sendFile(rootPath, (rootErr) => {
                if (rootErr) {
                    res.status(404).send('index.html not found on server');
                }
            });
        }
    });
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // WebRTC Signaling
    socket.on('offer', (data) => {
        socket.broadcast.emit('offer', data);
    });

    socket.on('answer', (data) => {
        socket.broadcast.emit('answer', data);
    });

    socket.on('candidate', (data) => {
        socket.broadcast.emit('candidate', data);
    });

    // Text Chat Messaging
    socket.on('chat-message', (data) => {
        socket.broadcast.emit('chat-message', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
