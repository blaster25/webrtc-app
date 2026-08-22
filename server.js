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
    // Get client IP address (handles proxies like Render / Cloudflare / local loopback)
    let clientIp = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;
    
    // Clean up IPv6 localhost format if necessary
    if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
        clientIp = '127.0.0.1';
    } else if (clientIp && clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim(); // Take the first IP if proxied
    }

    console.log(`User connected: ${socket.id} from IP: ${clientIp}`);

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

    // Text Chat Messaging with IP packing
    socket.on('chat-message', (encryptedData) => {
        socket.broadcast.emit('chat-message', {
            ip: clientIp,
            message: encryptedData
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
