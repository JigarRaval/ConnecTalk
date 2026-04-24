import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FaExclamationTriangle,
  FaMicrophone,
  FaPaperPlane,
  FaRedoAlt,
  FaStop,
  FaTimes,
} from "react-icons/fa";

const url = import.meta.env.VITE_URL || "http://localhost:5000";

const VoiceRecorder = ({ onSend, isSending = false }) => {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [micAvailable, setMicAvailable] = useState(true);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicAvailable(false);
      toast.error("Your browser does not support microphone recording.");
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (recording) {
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((time) => time + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [recording]);

  const requestMicrophonePermission = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionDenied(false);
      toast.success("Microphone ready");
      return stream;
    } catch (error) {
      console.error("Microphone error:", error);
      if (error.name === "NotAllowedError") {
        setPermissionDenied(true);
        toast.error("Microphone access denied. Click the mic button to retry.");
      } else if (error.name === "NotFoundError") {
        toast.error("No microphone found.");
      } else {
        toast.error(`Microphone error: ${error.message}`);
      }
      return null;
    }
  };

  const startRecording = async () => {
    if (permissionDenied) {
      toast.info("Requesting microphone permission...");
      await requestMicrophonePermission();
      if (permissionDenied) return;
    }

    const stream = await requestMicrophonePermission();
    if (!stream) return;

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const blobUrl = URL.createObjectURL(blob);
      setAudioURL(blobUrl);
      setAudioBlob(blob);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const cancelRecording = () => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
      setAudioURL(null);
      setAudioBlob(null);
    }

    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("voice", audioBlob, "voice.webm");

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${url}/api/auth/upload-voice`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      onSend(response.data.voiceUrl, response.data.fileType);
      cancelRecording();
    } catch (error) {
      console.error(error);
      toast.error("Failed to send voice message");
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!micAvailable) {
    return (
      <div className="flex items-center gap-1 p-2 text-xs text-red-500">
        <FaExclamationTriangle /> Mic not supported
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 animate-pulse dark:border-red-900/50 dark:bg-red-950/30">
        <div className="h-2 w-2 animate-ping rounded-full bg-red-500" />
        <span className="text-xs font-mono text-red-600 dark:text-red-400">
          {formatTime(recordingTime)}
        </span>
        <button
          onClick={stopRecording}
          className="rounded-full bg-stone-900 p-1 text-white transition hover:scale-105 dark:bg-amber-500 dark:text-stone-950"
          title="Stop recording"
        >
          <FaStop size={12} />
        </button>
      </div>
    );
  }

  if (audioURL) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-2 py-1 dark:border-stone-700 dark:bg-stone-800">
        <audio src={audioURL} controls className="h-8 w-32" />
        <button
          onClick={sendVoiceMessage}
          disabled={uploading}
          className="rounded-full bg-stone-900 p-1.5 text-white transition hover:scale-105 disabled:opacity-50 dark:bg-amber-500 dark:text-stone-950"
          title="Send"
        >
          {uploading ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-stone-950 dark:border-t-transparent" />
          ) : (
            <FaPaperPlane size={12} />
          )}
        </button>
        <button
          onClick={cancelRecording}
          className="rounded-full bg-stone-300 p-1.5 text-stone-800 transition hover:scale-105 dark:bg-stone-600 dark:text-stone-100"
          title="Cancel"
        >
          <FaTimes size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={startRecording}
        disabled={isSending}
        className={`rounded-full p-2 transition hover:scale-105 ${
          permissionDenied
            ? "bg-red-200 text-red-700 dark:bg-red-900/50"
            : "bg-stone-200 text-stone-700 hover:bg-stone-300 dark:bg-stone-700 dark:text-white dark:hover:bg-stone-600"
        } disabled:opacity-50`}
        title={
          permissionDenied
            ? "Microphone blocked - click to request"
            : "Record voice message"
        }
      >
        {permissionDenied ? <FaRedoAlt size={14} /> : <FaMicrophone size={14} />}
      </button>
      {permissionDenied && (
        <button
          onClick={requestMicrophonePermission}
          className="whitespace-nowrap text-xs text-amber-700 underline dark:text-amber-300"
        >
          Allow Mic
        </button>
      )}
    </div>
  );
};

export default VoiceRecorder;
