const socket = io(); // Establish socket connection

// DOM Elements
const localVideo = document.getElementById('localVideo');
const remoteVideosContainer = document.getElementById('remoteVideosContainer');
const connectedUsersList = document.getElementById('connectedUsersList');
const startVideoBtn = document.getElementById('startVideoBtn');
const stopVideoBtn = document.getElementById('stopVideoBtn');

// WebRTC Configuration
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { 
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]
};

// State variables
let localStream = null;
const peers = new Map(); // Store peer connections

// Start Video Function
async function startLocalVideo() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 }, 
            audio: true 
        });
        
        localVideo.srcObject = localStream;
        startVideoBtn.disabled = true;
        stopVideoBtn.disabled = false;

        // Notify server that we're ready to connect
        socket.emit('ready');
    } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Could not access camera and microphone');
    }
}

// Stop Video Function
function stopLocalVideo() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localVideo.srcObject = null;
        
        // Close all peer connections
        peers.forEach((peerConnection, userId) => {
            peerConnection.close();
        });
        peers.clear();

        startVideoBtn.disabled = false;
        stopVideoBtn.disabled = true;
    }
}

// Create Peer Connection
function createPeerConnection(userId) {
    // If connection already exists, return it
    if (peers.has(userId)) {
        return peers.get(userId);
    }

    const peerConnection = new RTCPeerConnection(configuration);
    peers.set(userId, peerConnection);

    // Add local stream tracks
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }

    // Create remote video element
    const remoteVideo = document.createElement('video');
    remoteVideo.id = `remote_${userId}`;
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;
    remoteVideosContainer.appendChild(remoteVideo);

    // Handle remote stream
    const remoteStream = new MediaStream();
    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
        });
        remoteVideo.srcObject = remoteStream;
    };

    // ICE candidate handling
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', { 
                to: userId, 
                candidate: event.candidate 
            });
        }
    };

    // Handle connection state
    peerConnection.onconnectionstatechange = (event) => {
        console.log(`Connection state with ${userId}:`, peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'failed') {
            // Attempt to restart ICE
            peerConnection.restartIce();
        }
    };

    return peerConnection;
}

// Create and Send Offer
async function createAndSendOffer(userId) {
    const peerConnection = createPeerConnection(userId);
    
    try {
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        
        await peerConnection.setLocalDescription(offer);
        
        socket.emit('offer', { 
            to: userId, 
            offer: peerConnection.localDescription 
        });
    } catch (error) {
        console.error('Error creating offer:', error);
    }
}

// Socket Event Listeners
socket.on('userList', (users) => {
    // Update connected users list
    connectedUsersList.innerHTML = users
        .filter(user => user.id !== socket.id)
        .map(user => `<li>${user.username}</li>`)
        .join('');

    // Only create offers if local stream is active
    if (localStream) {
        users.forEach(user => {
            if (user.id !== socket.id && !peers.has(user.id)) {
                createAndSendOffer(user.id);
            }
        });
    }
});

socket.on('offer', async ({ from, offer }) => {
    if (!localStream) return; // Ignore if no local stream

    const peerConnection = createPeerConnection(from);
    
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        socket.emit('answer', { 
            to: from, 
            answer: peerConnection.localDescription 
        });
    } catch (error) {
        console.error('Error handling offer:', error);
    }
});

socket.on('answer', async ({ from, answer }) => {
    const peerConnection = peers.get(from);
    if (peerConnection) {
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
            console.error('Error setting remote description:', error);
        }
    }
});

socket.on('candidate', async ({ from, candidate }) => {
    const peerConnection = peers.get(from);
    if (peerConnection) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }
});

// Event Listeners for Buttons
startVideoBtn.addEventListener('click', startLocalVideo);
stopVideoBtn.addEventListener('click', stopLocalVideo);