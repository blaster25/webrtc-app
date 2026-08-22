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

// --- Encrypted Text Chat Logic with IP Display ---
const passwordInput = document.getElementById('room-password');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages');

sendBtn.addEventListener('click', () => {
    const text = messageInput.value;
    const secretPassword = passwordInput.value;

    if (text.trim() === '') return;

    if (!secretPassword) {
        alert('Please enter a shared password to encrypt your message!');
        return;
    }

    // Encrypt the message using AES
    const encryptedMessage = CryptoJS.AES.encrypt(text, secretPassword).toString();

    // Display locally as 'You'
    appendMessage('You: ' + text);

    // Send the encrypted cipher text across the server socket
    socket.emit('chat-message', encryptedMessage);
    messageInput.value = '';
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
        // Try to decrypt the incoming message using the password
        const bytes = CryptoJS.AES.decrypt(encryptedData, secretPassword);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

        if (decryptedText) {
            appendMessage(`${senderIp}: ${decryptedText}`);
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
