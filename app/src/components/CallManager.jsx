import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaPhoneAlt,
  FaPhoneSlash,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";
import { buildImageUrl } from "../utils/media";

const CallManager = ({
  socket,
  userId,
  otherUserId,
  otherUsername,
  otherImage,
  callType,
  incomingSignal,
  isGroupCall,
  groupCallId,
  onClose,
}) => {
  const [callStatus, setCallStatus] = useState("idle");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [showIncomingModal, setShowIncomingModal] = useState(false);

  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const initiatorRef = useRef(false);
  const pendingSignalRef = useRef(null);
  const audioRef = useRef(null);

  const configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  const isVideoCall = callType === "video";

  useEffect(() => {
    if (showIncomingModal) {
      audioRef.current = new Audio("/ringing.mp3");
      audioRef.current.loop = true;
      audioRef.current.play().catch((error) => {
        console.log("Ringtone play failed:", error);
      });
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [showIncomingModal]);

  useEffect(() => {
    if (incomingSignal) {
      pendingSignalRef.current = incomingSignal;
      setShowIncomingModal(true);
    } else if (!incomingSignal && callStatus === "idle") {
      startCall();
    }

    return () => releaseAllResources();
  }, []);

  const releaseAllResources = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const initLocalStream = async () => {
    releaseAllResources();
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoCall,
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (error) {
      toast.error("Could not access camera/microphone");
      return null;
    }
  };

  const createPeerConnection = (stream) => {
    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

    peerConnection.ontrack = (event) => {
      const [nextRemoteStream] = event.streams;
      setRemoteStream(nextRemoteStream);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = nextRemoteStream;
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice_candidate", {
          to: otherUserId,
          candidate: event.candidate,
        });
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      if (
        peerConnection.iceConnectionState === "disconnected" ||
        peerConnection.iceConnectionState === "failed"
      ) {
        endCall();
      }
    };

    return peerConnection;
  };

  const startCall = async () => {
    setCallStatus("calling");
    initiatorRef.current = true;
    const stream = await initLocalStream();
    if (!stream) {
      endCall();
      return;
    }

    const peerConnection = createPeerConnection(stream);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("call_user", {
      from: userId,
      to: otherUserId,
      signalData: offer,
      callerName: otherUsername,
      callType,
    });
  };

  const acceptCall = async (signalData) => {
    setShowIncomingModal(false);
    setCallStatus("ringing");
    initiatorRef.current = false;
    const stream = await initLocalStream();
    if (!stream) {
      rejectCall();
      return;
    }

    const peerConnection = createPeerConnection(stream);

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("accept_call", { to: otherUserId, signalData: answer });
      setCallStatus("connected");
    } catch (error) {
      toast.error("Failed to accept call");
      endCall();
    }
  };

  const rejectCall = () => {
    setShowIncomingModal(false);
    socket.emit("reject_call", { to: otherUserId });
    endCall();
  };

  const endCall = () => {
    if (!isGroupCall) {
      socket.emit("end_call", { to: otherUserId });
    } else {
      socket.emit("end_group_call", { groupId: groupCallId });
    }

    releaseAllResources();
    setCallStatus("ended");
    onClose();
  };

  const toggleAudio = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !audioEnabled;
    });
    setAudioEnabled(!audioEnabled);
  };

  const toggleVideo = () => {
    if (!isVideoCall || !localStream) return;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !videoEnabled;
    });
    setVideoEnabled(!videoEnabled);
  };

  useEffect(() => {
    if (!socket) return undefined;

    const handleCallAccepted = async ({ signalData }) => {
      if (initiatorRef.current && peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(signalData)
        );
        setCallStatus("connected");
      }
    };

    const handleCallRejected = () => {
      toast("Call rejected");
      endCall();
    };

    const handleCallEnded = () => {
      toast("Call ended");
      endCall();
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (!peerConnectionRef.current) return;
      try {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.error(error);
      }
    };

    socket.on("call_accepted", handleCallAccepted);
    socket.on("call_rejected", handleCallRejected);
    socket.on("call_ended", handleCallEnded);
    socket.on("ice_candidate", handleIceCandidate);

    return () => {
      socket.off("call_accepted", handleCallAccepted);
      socket.off("call_rejected", handleCallRejected);
      socket.off("call_ended", handleCallEnded);
      socket.off("ice_candidate", handleIceCandidate);
    };
  }, [socket]);

  if (showIncomingModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-md animate-fade-in">
        <div className="mx-4 w-full max-w-sm rounded-[30px] border border-stone-200/70 bg-white/90 p-8 shadow-2xl backdrop-blur-lg scale-in dark:border-stone-700 dark:bg-stone-900/90">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <img
                src={buildImageUrl(otherImage)}
                alt={otherUsername}
                className="h-24 w-24 rounded-full border-4 border-amber-400 object-cover shadow-lg"
                onError={(event) => {
                  event.target.src = "/default-avatar.png";
                }}
              />
              <div className="absolute -bottom-2 -right-2 rounded-full bg-stone-900 p-2 shadow-md dark:bg-amber-500">
                {isVideoCall ? (
                  <FaVideo className="text-xs text-white dark:text-stone-950" />
                ) : (
                  <FaPhoneAlt className="text-xs text-white dark:text-stone-950" />
                )}
              </div>
            </div>

            <h3
              className="mt-4 text-2xl font-semibold text-stone-800 dark:text-white"
              style={{ fontFamily: '"Sora", sans-serif' }}
            >
              {otherUsername}
            </h3>
            <p className="mt-1 text-stone-600 dark:text-stone-300">
              Incoming {isVideoCall ? "video" : "voice"} call
            </p>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => acceptCall(pendingSignalRef.current)}
                className="flex items-center gap-2 rounded-full bg-stone-900 px-8 py-2 font-semibold text-white shadow-md transition hover:scale-105 hover:bg-stone-700 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
              >
                <FaPhoneAlt /> Accept
              </button>
              <button
                onClick={rejectCall}
                className="flex items-center gap-2 rounded-full bg-red-500 px-8 py-2 font-semibold text-white shadow-md transition hover:scale-105 hover:bg-red-600"
              >
                <FaPhoneSlash /> Reject
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          .animate-fade-in {
            animation: fadeIn 0.2s ease-out;
          }
          .scale-in {
            animation: scaleIn 0.2s ease-out;
          }
        `}</style>
      </div>
    );
  }

  if (callStatus === "idle" || callStatus === "ended") return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-md animate-fade-in">
      <div className="relative h-full max-h-[80vh] w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(160deg,#181512,#221d18)] shadow-2xl">
        {isVideoCall && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
        )}

        {!isVideoCall && (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(160deg,#1c1917,#292524)]">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-stone-800 text-5xl shadow-inner">
              <FaPhoneAlt className="text-amber-400" />
            </div>
            <p
              className="mt-6 text-2xl font-semibold text-white"
              style={{ fontFamily: '"Sora", sans-serif' }}
            >
              {otherUsername}
            </p>
            <p className="mt-1 text-sm text-stone-300">Voice call in progress</p>
          </div>
        )}

        {isVideoCall && (
          <div className="absolute bottom-6 right-6 h-32 w-40 overflow-hidden rounded-2xl border-2 border-white/30 shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="absolute left-6 top-6 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm font-medium text-white shadow-md backdrop-blur-sm">
          {callStatus === "calling" && "Calling..."}
          {callStatus === "ringing" && "Ringing..."}
          {callStatus === "connected" && "Connected"}
        </div>

        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6">
          <button
            onClick={toggleAudio}
            className={`rounded-full p-4 shadow-lg transition hover:scale-110 ${
              audioEnabled
                ? "bg-stone-700 text-white hover:bg-stone-600"
                : "bg-red-500 text-white hover:bg-red-600"
            }`}
            title={audioEnabled ? "Mute" : "Unmute"}
          >
            {audioEnabled ? <FaMicrophone size={24} /> : <FaMicrophoneSlash size={24} />}
          </button>

          {isVideoCall && (
            <button
              onClick={toggleVideo}
              className={`rounded-full p-4 shadow-lg transition hover:scale-110 ${
                videoEnabled
                  ? "bg-stone-700 text-white hover:bg-stone-600"
                  : "bg-red-500 text-white hover:bg-red-600"
              }`}
              title={videoEnabled ? "Turn off video" : "Turn on video"}
            >
              {videoEnabled ? <FaVideo size={24} /> : <FaVideoSlash size={24} />}
            </button>
          )}

          <button
            onClick={endCall}
            className="rounded-full bg-red-600 p-4 text-white shadow-lg transition hover:scale-110 hover:bg-red-700"
            title="End call"
          >
            <FaPhoneSlash size={24} />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CallManager;
