import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FaArrowLeft,
  FaPhoneAlt,
  FaPhoneSlash,
  FaTimes,
  FaTrashAlt,
  FaVideo,
} from "react-icons/fa";
import { buildImageUrl } from "../utils/media";

const url = import.meta.env.VITE_URL || "http://localhost:5000";

const CallHistory = ({ userId, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCallHistory();
  }, []);

  const fetchCallHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${url}/api/call-logs/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load call history");
    } finally {
      setLoading(false);
    }
  };

  const deleteLog = async (logId) => {
    if (!window.confirm("Delete this call record?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${url}/api/call-logs/${logId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs((previous) => previous.filter((log) => log._id !== logId));
      toast.success("Deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return "—";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString();
  };

  const getStatusIcon = (log) => {
    if (log.status === "answered") {
      return <FaPhoneAlt className="text-green-500" />;
    }
    if (log.status === "missed") {
      return <FaPhoneSlash className="text-red-500" />;
    }
    return <FaTimes className="text-amber-700 dark:text-amber-300" />;
  };

  const getCallTypeIcon = (type) =>
    type === "video" ? (
      <FaVideo className="text-amber-700 dark:text-amber-300" />
    ) : (
      <FaPhoneAlt className="text-stone-700 dark:text-stone-300" />
    );

  const getStatusText = (status) => {
    if (status === "answered") return "Answered";
    if (status === "missed") return "Missed";
    return "Declined";
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white/80 backdrop-blur-md dark:bg-stone-900/80">
        <div className="flex items-center justify-between border-b border-stone-200 p-5 dark:border-stone-700">
          <div className="h-7 w-32 animate-pulse rounded bg-stone-300 dark:bg-stone-700" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-stone-300 dark:bg-stone-700" />
        </div>
        <div className="flex-1 space-y-3 p-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between rounded-2xl bg-stone-100 p-3 animate-pulse dark:bg-stone-800/50"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-stone-300 dark:bg-stone-700" />
                <div>
                  <div className="mb-2 h-4 w-24 rounded bg-stone-300 dark:bg-stone-700" />
                  <div className="h-3 w-32 rounded bg-stone-300 dark:bg-stone-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white/80 backdrop-blur-md animate-fade-in-up dark:bg-stone-900/80">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white/50 px-5 py-4 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-800/50">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="rounded-full p-2 transition hover:scale-105 hover:bg-stone-200 dark:hover:bg-stone-700"
            aria-label="Back"
          >
            <FaArrowLeft className="text-stone-600 dark:text-stone-300" />
          </button>
          <h2
            className="text-xl font-semibold text-stone-900 dark:text-stone-100"
            style={{ fontFamily: '"Sora", sans-serif' }}
          >
            Call History
          </h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-2 transition hover:bg-stone-200 dark:hover:bg-stone-700"
          aria-label="Close"
        >
          <FaTimes className="text-stone-500 dark:text-stone-400" />
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {logs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 text-6xl opacity-50">📞</div>
            <p className="text-lg text-stone-500 dark:text-stone-400">No call history</p>
            <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
              Your call logs will appear here
            </p>
          </div>
        ) : (
          logs.map((log, index) => {
            const isOutgoing = log.from?._id === userId;
            const otherUser = isOutgoing ? log.to : log.from;
            const directionText = isOutgoing ? "Outgoing" : "Incoming";
            const statusIcon = getStatusIcon(log);
            const statusText = getStatusText(log.status);

            return (
              <div
                key={log._id}
                className="group flex items-center justify-between rounded-2xl bg-white/60 p-3 backdrop-blur-sm transition hover:scale-[1.01] hover:shadow-md animate-fade-in dark:bg-stone-800/60"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <img
                    src={buildImageUrl(otherUser?.image)}
                    alt={otherUser?.username}
                    className="h-12 w-12 rounded-2xl border border-white object-cover shadow-sm dark:border-stone-700"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-stone-800 dark:text-white">
                        {otherUser?.username || "Unknown"}
                      </p>
                      <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
                        {directionText}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        {statusIcon}
                        <span
                          className={`text-xs font-medium capitalize ${
                            log.status === "answered"
                              ? "text-green-600 dark:text-green-400"
                              : log.status === "missed"
                              ? "text-red-600 dark:text-red-400"
                              : "text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {statusText}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {getCallTypeIcon(log.callType)}
                        <span className="text-xs text-stone-500 dark:text-stone-400">
                          {log.callType === "video" ? "Video" : "Voice"}
                        </span>
                      </div>

                      <span className="text-xs text-stone-500 dark:text-stone-400">
                        ⏱ {formatDuration(log.duration)}
                      </span>
                      <span className="text-xs text-stone-400 dark:text-stone-500">
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteLog(log._id)}
                  className="rounded-full p-2 text-stone-400 opacity-70 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  aria-label="Delete log"
                >
                  <FaTrashAlt size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out;
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default CallHistory;
