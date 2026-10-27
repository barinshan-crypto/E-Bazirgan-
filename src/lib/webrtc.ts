import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  addDoc 
} from 'firebase/firestore';
import { firestore } from './firebase';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }
  ],
  iceCandidatePoolSize: 10
};

export interface WebRTCBroadcasterControls {
  stop: () => void;
  updateStream: (newStream: MediaStream) => void;
}

/**
 * Initializes the WebRTC Broadcaster to stream local video/audio tracks
 * to any viewers that connect to this live session.
 */
export function initWebRTCBroadcaster(
  sessionId: string,
  localStream: MediaStream,
  onViewerCountChange?: (count: number) => void
): WebRTCBroadcasterControls {
  if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
    return { stop: () => {}, updateStream: () => {} };
  }

  const activePeers = new Map<string, { pc: RTCPeerConnection; unsubCandidates?: () => void }>();
  let currentStream = localStream;

  const callsColl = collection(firestore, 'live_sessions', sessionId, 'calls');

  const unsubscribeCalls = onSnapshot(callsColl, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      const viewerId = change.doc.id;
      const data = change.doc.data();

      if (change.type === 'removed') {
        const peer = activePeers.get(viewerId);
        if (peer) {
          if (peer.unsubCandidates) peer.unsubCandidates();
          try { peer.pc.close(); } catch (_) {}
          activePeers.delete(viewerId);
          if (onViewerCountChange) onViewerCountChange(activePeers.size);
        }
        return;
      }

      // Viewer sent an offer and needs an answer
      if ((change.type === 'added' || change.type === 'modified') && data.offer && !data.answer) {
        // If we already have a peer for this viewer, close it first
        const existing = activePeers.get(viewerId);
        if (existing) {
          if (existing.unsubCandidates) existing.unsubCandidates();
          try { existing.pc.close(); } catch (_) {}
          activePeers.delete(viewerId);
        }

        try {
          const pc = new RTCPeerConnection(RTC_CONFIG);

          // Add current local tracks (video & audio)
          currentStream.getTracks().forEach((track) => {
            pc.addTrack(track, currentStream);
          });

          // WeChat Live standard: Optimize video encoding bitrate & framerate priority
          try {
            pc.getSenders().forEach((sender) => {
              if (sender.track && sender.track.kind === 'video') {
                const params = sender.getParameters();
                if (!params.encodings || params.encodings.length === 0) {
                  params.encodings = [{}];
                }
                // Cap bitrate at 950 kbps to prevent mobile bufferbloat and guarantee smooth 30fps
                params.encodings[0].maxBitrate = 950_000;
                params.encodings[0].networkPriority = 'high';
                (params as any).degradationPreference = 'maintain-framerate';
                sender.setParameters(params).catch(() => {});
              }
            });
          } catch (_) {}

          const broadcasterCandidatesColl = collection(firestore, 'live_sessions', sessionId, 'calls', viewerId, 'broadcasterCandidates');
          const viewerCandidatesColl = collection(firestore, 'live_sessions', sessionId, 'calls', viewerId, 'viewerCandidates');

          // Send broadcaster's ICE candidates to Firestore
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              addDoc(broadcasterCandidatesColl, event.candidate.toJSON()).catch(() => {});
            }
          };

          // Handle disconnection
          pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
              const peer = activePeers.get(viewerId);
              if (peer) {
                if (peer.unsubCandidates) peer.unsubCandidates();
                try { peer.pc.close(); } catch (_) {}
                activePeers.delete(viewerId);
                if (onViewerCountChange) onViewerCountChange(activePeers.size);
              }
            }
          };

          // Set remote offer
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

          // Create and set local answer
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          // Store answer in Firestore
          await updateDoc(change.doc.ref, {
            answer: { type: answer.type, sdp: answer.sdp },
            answeredAt: Date.now()
          });

          // Listen for viewer's ICE candidates
          const unsubCandidates = onSnapshot(viewerCandidatesColl, (candSnap) => {
            candSnap.docChanges().forEach(async (candChange) => {
              if (candChange.type === 'added') {
                const candData = candChange.doc.data();
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(candData));
                } catch (_) {}
              }
            });
          });

          activePeers.set(viewerId, { pc, unsubCandidates });
          if (onViewerCountChange) onViewerCountChange(activePeers.size);
        } catch (err) {
          console.warn("Error establishing WebRTC connection with viewer:", viewerId, err);
        }
      }
    });
  });

  return {
    stop: () => {
      unsubscribeCalls();
      activePeers.forEach(({ pc, unsubCandidates }) => {
        if (unsubCandidates) unsubCandidates();
        try { pc.close(); } catch (_) {}
      });
      activePeers.clear();
      if (onViewerCountChange) onViewerCountChange(0);
    },
    updateStream: (newStream: MediaStream) => {
      currentStream = newStream;
      activePeers.forEach(({ pc }) => {
        try {
          const senders = pc.getSenders();
          newStream.getTracks().forEach((newTrack) => {
            const sender = senders.find((s) => s.track && s.track.kind === newTrack.kind);
            if (sender) {
              sender.replaceTrack(newTrack).catch(() => {});
            } else {
              pc.addTrack(newTrack, newStream);
            }
          });
        } catch (_) {}
      });
    }
  };
}

/**
 * Initializes a WebRTC Viewer to receive real-time video/audio stream from the broadcaster.
 */
export function initWebRTCViewer(
  sessionId: string,
  viewerId: string,
  onRemoteStream: (stream: MediaStream) => void,
  onStateChange?: (state: RTCPeerConnectionState) => void
): () => void {
  if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
    return () => {};
  }

  let isCleanedUp = false;
  let pc: RTCPeerConnection | null = null;
  let unsubCall: (() => void) | null = null;
  let unsubCandidates: (() => void) | null = null;

  const callDocRef = doc(firestore, 'live_sessions', sessionId, 'calls', viewerId);
  const broadcasterCandidatesColl = collection(firestore, 'live_sessions', sessionId, 'calls', viewerId, 'broadcasterCandidates');
  const viewerCandidatesColl = collection(firestore, 'live_sessions', sessionId, 'calls', viewerId, 'viewerCandidates');

  const startViewer = async () => {
    try {
      pc = new RTCPeerConnection(RTC_CONFIG);

      // Listen for remote audio/video tracks with low-latency playout
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          try {
            if (pc) {
              pc.getReceivers().forEach((receiver) => {
                if ('jitterBufferTarget' in receiver) {
                  (receiver as any).jitterBufferTarget = 150;
                }
                if ('playoutDelayHint' in receiver) {
                  (receiver as any).playoutDelayHint = 0.15;
                }
              });
            }
          } catch (_) {}
          onRemoteStream(event.streams[0]);
        } else if (event.track) {
          const stream = new MediaStream([event.track]);
          onRemoteStream(stream);
        }
      };

      pc.onconnectionstatechange = () => {
        if (!pc) return;
        if (onStateChange) onStateChange(pc.connectionState);
        if (pc.connectionState === 'failed') {
          try {
            pc.restartIce();
          } catch (_) {}
        }
      };

      // Send viewer's ICE candidates to Firestore
      pc.onicecandidate = (event) => {
        if (event.candidate && !isCleanedUp) {
          addDoc(viewerCandidatesColl, event.candidate.toJSON()).catch(() => {});
        }
      };

      // Create offer to receive video and audio
      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true
      });
      await pc.setLocalDescription(offer);

      if (isCleanedUp) return;

      // Save offer in Firestore
      await setDoc(callDocRef, {
        offer: { type: offer.type, sdp: offer.sdp },
        viewerId,
        createdAt: Date.now()
      });

      const pendingCandidates: any[] = [];

      // Listen for broadcaster's answer
      unsubCall = onSnapshot(callDocRef, async (snapshot) => {
        const data = snapshot.data();
        if (data && data.answer && pc && pc.signalingState !== 'stable') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            // Drain any pending ICE candidates that arrived before remote description
            while (pendingCandidates.length > 0) {
              const cand = pendingCandidates.shift();
              if (cand && pc) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch (_) {}
              }
            }
          } catch (e) {
            console.warn("Failed to set remote description on viewer:", e);
          }
        }
      });

      // Listen for broadcaster's ICE candidates
      unsubCandidates = onSnapshot(broadcasterCandidatesColl, (candSnap) => {
        candSnap.docChanges().forEach(async (change) => {
          if (change.type === 'added' && pc) {
            const candData = change.doc.data();
            if (!pc.remoteDescription) {
              pendingCandidates.push(candData);
            } else {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candData));
              } catch (_) {}
            }
          }
        });
      });
    } catch (err) {
      console.warn("Viewer WebRTC connection error:", err);
    }
  };

  startViewer();

  return () => {
    isCleanedUp = true;
    if (unsubCall) unsubCall();
    if (unsubCandidates) unsubCandidates();
    if (pc) {
      try { pc.close(); } catch (_) {}
    }
    // Delete call doc on exit to free resources
    deleteDoc(callDocRef).catch(() => {});
  };
}
