const socket = io();

// --- WebRTC Logic ---
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;

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

// --- Elements & Storage ---
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('room-password');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages');

window.addEventListener('DOMContentLoaded', () => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }

    try {
        const savedUsername = localStorage.getItem('webrtc_chat_username');
        if (savedUsername) usernameInput.value = savedUsername;

        const savedPassword = localStorage.getItem('webrtc_chat_password');
        if (savedPassword) passwordInput.value = savedPassword;
    } catch (e) {
        console.log('LocalStorage restricted.');
    }
});

usernameInput.addEventListener('input', () => {
    try {
        localStorage.setItem('webrtc_chat_username', usernameInput.value.trim());
    } catch (e) {}
});

passwordInput.addEventListener('input', () => {
    try {
        localStorage.setItem('webrtc_chat_password', passwordInput.value.trim());
    } catch (e) {}
});

function sendMessage() {
    const text = messageInput.value;
    const username = usernameInput.value.trim() || 'Anonymous';
    const secretPassword = passwordInput.value.trim();

    if (text.trim() === '') return;

    if (!secretPassword) {
        alert('Please enter a shared password to encrypt your message!');
        return;
    }

    const encryptedMessage = CryptoJS.AES.encrypt(text, secretPassword).toString();
    appendMessage('You: ' + text);

    socket.emit('chat-message', {
        username: username,
        message: encryptedMessage
    });
    messageInput.value = '';
}

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});

socket.on('chat-message', (data) => {
    const secretPassword = passwordInput.value.trim();
    const senderName = data.username || 'Anonymous';
    const encryptedData = data.message;

    if (!secretPassword) {
        appendMessage(`${senderName}: [Encrypted Message - Enter password to read]`);
        return;
    }

    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, secretPassword);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

        if (decryptedText) {
            appendMessage(`${senderName}: ${decryptedText}`);
            showNotification(senderName, decryptedText);
        } else {
            appendMessage(`${senderName}: [Decryption Failed - Wrong Password]`);
        }
    } catch (e) {
        appendMessage(`${senderName}: [Decryption Failed]`);
    }
});

function appendMessage(text) {
    const div = document.createElement('div');
    div.textContent = text;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showNotification(sender, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(`Message from ${sender}`, {
                body: message,
                icon: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png'
            });
        } catch (err) {
            console.log('Notification error:', err);
        }
    }
}
