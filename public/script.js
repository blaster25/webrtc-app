const socket = io();

// --- WebRTC Logic ---
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let peerConnection;

const servers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

async function init() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (error) {
        console.error('Error accessing media devices.', error);
    }
}

init();

// --- Text Chat Logic ---
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages');

sendBtn.addEventListener('click', () => {
    const message = messageInput.value;
    if (message.trim() !== '') {
        appendMessage('You: ' + message);
        socket.emit('chat-message', message);
        messageInput.value = '';
    }
});

socket.on('chat-message', (message) => {
    appendMessage('Peer: ' + message);
});

function appendMessage(text) {
    const div = document.createElement('div');
    div.textContent = text;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
