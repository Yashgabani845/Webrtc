const socket = io();

// DOM elements
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');

// WebRTC variables
let localStream;
let remoteStream;
let peerConnection;

const iceServers = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302', // Google's public STUN server
        },
    ],
};

// Get user media and start the call
startButton.addEventListener('click', async () => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;

        createPeerConnection();
    } catch (error) {
        console.error('Error accessing media devices:', error);
    }
});

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(iceServers);

    // Add local stream tracks to peer connection
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
        if (!remoteStream) {
            remoteStream = new MediaStream();
            remoteVideo.srcObject = remoteStream;
        }
        remoteStream.addTrack(event.track);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate);
        }
    };

    // Create and send offer
    peerConnection.onnegotiationneeded = async () => {
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('offer', peerConnection.localDescription);
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    };
}

// Handle incoming offer
socket.on('offer', async (offer) => {
    if (!peerConnection) createPeerConnection();

    await peerConnection.setRemoteDescription(offer);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit('answer', peerConnection.localDescription);
});

// Handle incoming answer
socket.on('answer', async (answer) => {
    await peerConnection.setRemoteDescription(answer);
});

// Handle incoming ICE candidates
socket.on('candidate', async (candidate) => {
    try {
        await peerConnection.addIceCandidate(candidate);
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
});
