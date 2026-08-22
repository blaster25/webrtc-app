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

// --- Request Browser Notification Permission on Load ---
window.addEventListener('DOMContentLoaded', () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    try {
        const savedPassword = localStorage.getItem('webrtc_chat_password');
        if (savedPassword) {
            document.getElementById('room-password').value = savedPassword;
        }
    } catch (e) {
        console.log('LocalStorage restricted.');
    }
});

// --- Encrypted Text Chat Logic ---
const passwordInput = document.getElementById('room-password');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages');

passwordInput.addEventListener('input', () => {
    try {
        localStorage.setItem('webrtc_chat_password', passwordInput.value);
    } catch (e) {
        console.log('Could not save to LocalStorage.');
    }
});

function sendMessage() {
    const text = messageInput.value;
    const secretPassword = passwordInput.value;

    if (text.trim() === '') return;

    if (!secretPassword) {
        alert('Please enter a shared password to encrypt your message!');
        return;
    }

    const encryptedMessage = CryptoJS.AES.encrypt(text, secretPassword).toString();
    appendMessage('You: ' + text);

    socket.emit('chat-message', encryptedMessage);
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
    const secretPassword = passwordInput.value;
    const senderIp = data.ip || 'Unknown IP';
    const encryptedData = data.message;

    if (!secretPassword) {
        appendMessage(`${senderIp}: [Encrypted Message - Enter password to read]`);
        return;
    }

    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, secretPassword);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

        if (decryptedText) {
            appendMessage(`${senderIp}: ${decryptedText}`);
            
            // Trigger browser notification if allowed and tab is backgrounded
            showNotification(senderIp, decryptedText);
        } else {
            appendMessage(`${senderIp}: [Decryption Failed - Wrong Password]`);
        }
    } catch (e) {
        appendMessage(`${senderIp}: [Decryption Failed]`);
    }
});

function appendMessage(text) {
    const div = document.createElement('div');
    div.textContent = text;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Function to trigger native browser popup notification
function showNotification(sender, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        // Only trigger if window is out of focus / backgrounded, or always notify
        new Notification(`New Secure Message from ${sender}`, {
            body: message,
            icon: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png'
        });
    }
}
