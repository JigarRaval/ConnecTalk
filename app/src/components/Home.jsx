import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import toast from "react-hot-toast";
import {
  FaArrowLeft,
  FaBroadcastTower,
  FaCheckDouble,
  FaComments,
  FaEdit,
  FaForward,
  FaHeart,
  FaHistory,
  FaLaugh,
  FaMoon,
  FaPaperPlane,
  FaPhone,
  FaPlus,
  FaReply,
  FaSearch,
  FaSignOutAlt,
  FaSun,
  FaThumbsUp,
  FaTrash,
  FaUserPlus,
  FaUserMinus,
  FaUsers,
  FaVideo,
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import {
  requestNotificationPermission,
  showNotification,
} from "../utils/notifications";
import { buildImageUrl, buildUploadUrl } from "../utils/media";
import AudioPlayer from "./AudioPlayer";
import CallHistory from "./CallHistory";
import CallManager from "./CallManager";
import CreateGroupModal from "./CreateGroupModal";
import FileUploader from "./FileUploader";
import ForwardModal from "./ForwardModal";
import GroupChat from "./GroupChat";
import StatusViewer from "./StatusViewer";
import VoiceRecorder from "./VoiceRecorder";

const url = import.meta.env.VITE_URL || "http://localhost:5000";
let socket;

const navigationTabs = [
  { id: "chats", label: "Friends", icon: FaUsers },
  { id: "find", label: "Find Friends", icon: FaUserPlus },
  { id: "groups", label: "Groups", icon: FaUsers },
  { id: "status", label: "Status", icon: FaBroadcastTower },
];

const getFileUrl = (filePath) => buildUploadUrl(filePath);
const getImageUrl = (imagePath) => buildImageUrl(imagePath);

const formatTime = (value) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const renderFileMessage = (fileUrl, fileType, fileName) => {
  const fullUrl = getFileUrl(fileUrl);
  if (!fullUrl) return <p className="text-red-500">File unavailable</p>;

  if (fileType?.startsWith("image/")) {
    return (
      <div className="max-w-xs">
        <img
          src={fullUrl}
          alt="shared"
          className="max-h-64 max-w-full cursor-pointer rounded-2xl object-contain"
          onClick={() => window.open(fullUrl, "_blank")}
          onError={(e) => (e.target.src = "/default-avatar.png")}
        />
        <a
          href={fullUrl}
          download={fileName || "download"}
          className="mt-2 block text-xs font-medium text-amber-700 underline underline-offset-2 dark:text-amber-300"
        >
          Download
        </a>
      </div>
    );
  }

  if (fileType?.startsWith("video/")) {
    return (
      <div className="max-w-xs">
        <video controls className="max-h-64 rounded-2xl">
          <source src={fullUrl} type={fileType} />
        </video>
        <a
          href={fullUrl}
          download={fileName || "video.mp4"}
          className="mt-2 block text-xs font-medium text-amber-700 underline underline-offset-2 dark:text-amber-300"
        >
          Download
        </a>
      </div>
    );
  }

  if (fileType?.startsWith("audio/")) {
    return <AudioPlayer src={fullUrl} />;
  }

  return (
    <a
      href={fullUrl}
      download={fileName || "file"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm font-medium text-amber-700 underline underline-offset-2 dark:text-amber-300"
    >
      <span>Document</span>
      <span>{fileName || "Download file"}</span>
    </a>
  );
};

const StatTile = ({ label, value }) => (
  <div className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-stone-700/60 dark:bg-stone-900/55">
    <div className="text-xs uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">
      {label}
    </div>
    <div
      className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-100"
      style={{ fontFamily: '"Sora", sans-serif' }}
    >
      {value}
    </div>
  </div>
);

const EmptyStateCard = ({ title, description, action, icon: Icon }) => (
  <div className="rounded-[28px] border border-stone-200/75 bg-white/75 p-6 shadow-[0_24px_60px_rgba(28,25,23,0.08)] backdrop-blur-xl dark:border-stone-700/60 dark:bg-stone-900/60">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900">
      <Icon size={18} />
    </div>
    <h3
      className="mt-5 text-xl font-semibold text-stone-900 dark:text-stone-100"
      style={{ fontFamily: '"Sora", sans-serif' }}
    >
      {title}
    </h3>
    <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
      {description}
    </p>
    {action}
  </div>
);

// Custom confirmation modal
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-stone-900">
        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          {title}
        </h3>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [user] = useState(() => {
    if (location.state) return location.state;
    const saved = localStorage.getItem("user");
    if (saved) return JSON.parse(saved);
    return null;
  });

  const { username, image, userId } = user || {};

  const [allUsers, setAllUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [activeTab, setActiveTab] = useState("chats");
  const [sendingVoice, setSendingVoice] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [statusGroups, setStatusGroups] = useState([]);
  const [selectedStatusUser, setSelectedStatusUser] = useState(null);
  const [showStatusViewer, setShowStatusViewer] = useState(false);
  const [showStatusUploadModal, setShowStatusUploadModal] = useState(false);
  const [statusMedia, setStatusMedia] = useState(null);
  const [statusUploading, setStatusUploading] = useState(false);
  const [forwardModalMessage, setForwardModalMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [sentRequestIds, setSentRequestIds] = useState(new Set());
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const canvasRef = useRef(null);

  // Particle background (same as before)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext("2d");
    let animationId;
    let particles = [];

    const palette =
      theme === "dark"
        ? ["rgba(231, 221, 208, ", "rgba(245, 158, 11, "]
        : ["rgba(120, 113, 108, ", "rgba(180, 83, 9, "];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.min(
        90,
        Math.floor((canvas.width * canvas.height) / 10000)
      );
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2.5 + 0.8,
        speedX: (Math.random() - 0.5) * 0.24,
        speedY: (Math.random() - 0.5) * 0.2,
        alpha: Math.random() * 0.3 + 0.08,
        phase: Math.random() * Math.PI * 2,
        color: palette[Math.floor(Math.random() * palette.length)],
      }));
    };

    const draw = () => {
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.phase += 0.01;
        if (particle.x < -5) particle.x = canvas.width + 5;
        if (particle.x > canvas.width + 5) particle.x = -5;
        if (particle.y < -5) particle.y = canvas.height + 5;
        if (particle.y > canvas.height + 5) particle.y = -5;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = `${particle.color}${
          particle.alpha + Math.sin(particle.phase) * 0.08
        })`;
        context.fill();
      });
      animationId = requestAnimationFrame(draw);
    };

    resizeCanvas();
    draw();
    window.addEventListener("resize", resizeCanvas);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [theme]);

  useEffect(() => {
    socket = io(url, { autoConnect: true });
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user) {
      navigate("/login");
      return;
    }
    localStorage.setItem("user", JSON.stringify(user));
  }, [navigate, user]);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const [usersRes, friendsRes, requestsRes, groupsRes, statusRes] =
        await Promise.all([
          axios.get(`${url}/api/auth/users`, { headers }),
          axios.get(`${url}/api/auth/friends`, { headers }),
          axios.get(`${url}/api/auth/friend-requests`, { headers }),
          axios.get(`${url}/api/groups/my-groups`, { headers }),
          axios.get(`${url}/api/status/friends`, { headers }),
        ]);
      setAllUsers(usersRes.data);
      setFriends(friendsRes.data);
      setFriendRequests(requestsRes.data);
      setGroups(groupsRes.data);
      setStatusGroups(statusRes.data);
    } catch (error) {
      console.error("Fetch data error", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch sent friend request IDs (to persist "Request Sent" after refresh)
  useEffect(() => {
    const fetchSentRequests = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${url}/api/auth/sent-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSentRequestIds(new Set(res.data.sentIds));
      } catch (err) {
        console.error("Failed to fetch sent requests", err);
      }
    };
    if (userId) fetchSentRequests();
  }, [userId]);

  // Scroll restoration
  useEffect(() => {
    const supportsManualScrollRestoration =
      "scrollRestoration" in window.history;
    const previousScrollRestoration = supportsManualScrollRestoration
      ? window.history.scrollRestoration
      : null;
    if (supportsManualScrollRestoration)
      window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    return () => {
      if (supportsManualScrollRestoration && previousScrollRestoration) {
        window.history.scrollRestoration = previousScrollRestoration;
      }
    };
  }, []);

  const scrollMessagesToBottom = useCallback((behavior = "auto") => {
    const container = messagesContainerRef.current;
    if (container)
      container.scrollTo({ top: container.scrollHeight, behavior });
    setIsAtBottom(true);
  }, []);

  useEffect(() => {
    if (!allUsers.length && !friends.length && !groups.length) return;
    const params = new URLSearchParams(window.location.search);
    const chatId = params.get("chat");
    const groupIdParam = params.get("group");
    if (chatId) {
      const nextUser = [...friends, ...allUsers].find(
        (entry) => entry._id === chatId
      );
      if (nextUser) {
        setSelectedUser(nextUser);
        setSelectedGroup(null);
      }
    } else if (groupIdParam) {
      const nextGroup = groups.find((entry) => entry._id === groupIdParam);
      if (nextGroup) {
        setSelectedGroup(nextGroup);
        setSelectedUser(null);
      }
    }
    if (chatId || groupIdParam) {
      window.history.replaceState({}, document.title, "/home");
    }
  }, [allUsers, friends, groups]);

  // Socket events
  useEffect(() => {
    if (!userId || !socket) return undefined;
    socket.emit("join_room", userId);

    socket.on("incoming_call", ({ from, signalData, callType }) => {
      const caller = [...friends, ...allUsers].find(
        (entry) => entry._id === from
      );
      if (!caller) return;
      if (document.hidden) {
        showNotification(
          `Incoming ${callType === "video" ? "Video" : "Voice"} Call`,
          `${caller.username} is calling you`,
          `/home?chat=${from}`
        );
      }
      setActiveCall({
        otherUserId: from,
        otherUsername: caller.username,
        otherImage: caller.image,
        incomingSignal: signalData,
        type: callType || "video",
      });
    });

    socket.on("group_call_invitation", ({ from, groupId, callType }) => {
      const group = groups.find((entry) => entry._id === groupId);
      if (!group) return;
      const caller =
        group.members?.find((member) => member._id === from) ||
        friends.find((friend) => friend._id === from) ||
        allUsers.find((entry) => entry._id === from);
      if (!caller) return;
      if (document.hidden) {
        showNotification(
          "Group Call Invitation",
          `${caller.username} is starting a group call`,
          `/home?group=${groupId}`
        );
      }
      setActiveCall({
        otherUserId: from,
        otherUsername: caller.username,
        otherImage: caller.image,
        type: callType,
        incomingSignal: null,
        isGroupCall: true,
        groupCallId: groupId,
      });
    });

    socket.on("receive_message", (incomingMessage) => {
      setMessages((prev) => [...prev, incomingMessage]);
      if (selectedUser && incomingMessage.from === selectedUser._id) {
        socket.emit("mark_read", { userId, otherUserId: selectedUser._id });
      } else if (document.hidden) {
        const sender = [...friends, ...allUsers].find(
          (entry) => entry._id === incomingMessage.from
        );
        if (sender) {
          showNotification(
            `New message from ${sender.username}`,
            incomingMessage.content?.substring(0, 100) || "New file",
            `/home?chat=${incomingMessage.from}`
          );
        }
      }
    });

    socket.on("message_sent", (outgoingMessage) => {
      setMessages((prev) => [...prev, outgoingMessage]);
    });

    socket.on("user_typing", ({ from, isTyping: nextTyping }) => {
      if (selectedUser && from === selectedUser._id)
        setTypingUser(nextTyping ? from : null);
    });

    socket.on("messages_read", ({ from }) => {
      if (!selectedUser || selectedUser._id !== from) return;
      setMessages((prev) =>
        prev.map((entry) =>
          entry.from === from && entry.to === userId
            ? { ...entry, read: true }
            : entry
        )
      );
    });

    socket.on("user_online", (id) =>
      setOnlineUsers((prev) => new Set([...prev, id]))
    );
    socket.on("user_offline", (id) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });

    socket.on("message_edited", ({ messageId, newContent }) => {
      setMessages((prev) =>
        prev.map((entry) =>
          entry._id === messageId
            ? { ...entry, content: newContent, edited: true }
            : entry
        )
      );
    });

    socket.on("message_deleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((entry) => entry._id !== messageId));
    });

    socket.on("reaction_updated", ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((entry) =>
          entry._id === messageId ? { ...entry, reactions } : entry
        )
      );
    });

    socket.on("friend_request_received", () => {
      toast.success("New friend request!");
      fetchData();
    });

    socket.on("friend_request_accepted", ({ by }) => {
      toast.success("Friend request accepted!");
      setSentRequestIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(by);
        return newSet;
      });
      fetchData();
    });

    socket.on("friend_removed", ({ by }) => {
      toast.info("You are no longer friends with that user.");
      fetchData();
      if (selectedUser && selectedUser._id === by) setSelectedUser(null);
    });

    return () => {
      socket.off("incoming_call");
      socket.off("group_call_invitation");
      socket.off("receive_message");
      socket.off("message_sent");
      socket.off("user_typing");
      socket.off("messages_read");
      socket.off("user_online");
      socket.off("user_offline");
      socket.off("message_edited");
      socket.off("message_deleted");
      socket.off("reaction_updated");
      socket.off("friend_request_received");
      socket.off("friend_request_accepted");
      socket.off("friend_removed");
    };
  }, [allUsers, fetchData, friends, groups, selectedUser, userId]);

  useEffect(() => {
    if (!selectedUser || !userId) return undefined;
    const fetchMessages = async () => {
      try {
        const response = await axios.get(
          `${url}/api/auth/messages/${userId}/${selectedUser._id}`
        );
        setMessages(response.data);
        socket.emit("mark_read", { userId, otherUserId: selectedUser._id });
        requestAnimationFrame(() => scrollMessagesToBottom("auto"));
      } catch (error) {
        console.error("Error fetching messages", error);
      }
    };
    fetchMessages();
    setIsAtBottom(true);
    return () => setTypingUser(null);
  }, [scrollMessagesToBottom, selectedUser, userId]);

  useEffect(() => {
    if (!selectedUser) return;
    if (isAtBottom) scrollMessagesToBottom("smooth");
  }, [isAtBottom, messages, scrollMessagesToBottom, selectedUser]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    setIsAtBottom(scrollHeight - scrollTop <= clientHeight + 20);
  };

  const handleTyping = (event) => {
    const nextValue = event.target.value;
    setMessage(nextValue);
    if (!selectedUser) return;
    if (!typing) {
      setTyping(true);
      socket.emit("typing", {
        from: userId,
        to: selectedUser._id,
        isTyping: true,
      });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      socket.emit("typing", {
        from: userId,
        to: selectedUser._id,
        isTyping: false,
      });
    }, 1000);
  };

  const handleSendMessage = () => {
    if ((!message.trim() && !editingMessage) || !selectedUser) return;
    if (editingMessage) {
      socket.emit("edit_message", {
        messageId: editingMessage._id,
        newContent: message,
        userId,
      });
      setEditingMessage(null);
      setMessage("");
      return;
    }
    socket.emit("send_message", {
      from: userId,
      to: selectedUser._id,
      content: message,
      timestamp: new Date().toISOString(),
      replyTo: replyTo?._id || null,
    });
    setMessage("");
    setReplyTo(null);
    requestAnimationFrame(() => scrollMessagesToBottom("smooth"));
  };

  const handleSendVoice = (voiceUrl, fileType) => {
    if (!selectedUser) return;
    socket.emit("send_message", {
      from: userId,
      to: selectedUser._id,
      content: "Voice message",
      fileUrl: voiceUrl,
      fileType,
      timestamp: new Date().toISOString(),
    });
    requestAnimationFrame(() => scrollMessagesToBottom("smooth"));
  };

  const handleSendFile = (fileUrl, fileType, originalName) => {
    if (!selectedUser) return;
    socket.emit("send_message", {
      from: userId,
      to: selectedUser._id,
      content: originalName || "File",
      fileUrl,
      fileType,
      timestamp: new Date().toISOString(),
    });
    requestAnimationFrame(() => scrollMessagesToBottom("smooth"));
  };

  const handleDeleteMessage = (messageId) => {
    setConfirmDialog({
      open: true,
      title: "Delete Message",
      message: "Are you sure you want to delete this message?",
      onConfirm: () => {
        socket.emit("delete_message", { messageId, userId });
        setConfirmDialog({
          open: false,
          title: "",
          message: "",
          onConfirm: null,
        });
      },
    });
  };

  const handleAddReaction = (messageId, emoji) => {
    socket.emit("add_reaction", { messageId, userId, emoji });
  };

  const handleSendFriendRequest = async (toUserId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${url}/api/auth/friend-request/${toUserId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSentRequestIds((prev) => new Set(prev).add(toUserId));
      toast.success("Friend request sent!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error");
    }
  };

  const handleRemoveFriend = (friendId) => {
    setConfirmDialog({
      open: true,
      title: "Remove Friend",
      message: "Are you sure you want to remove this friend?",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");
          await axios.delete(`${url}/api/auth/friend/${friendId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          toast.success("Friend removed");
          fetchData();
          if (selectedUser && selectedUser._id === friendId)
            setSelectedUser(null);
        } catch (error) {
          toast.error(error.response?.data?.message || "Error removing friend");
        } finally {
          setConfirmDialog({
            open: false,
            title: "",
            message: "",
            onConfirm: null,
          });
        }
      },
    });
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${url}/api/auth/friend-request/${requestId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Friend added!");
      fetchData();
    } catch (error) {
      toast.error("Error accepting request");
    }
  };

  const handleForwardConfirm = (msg, destinationId, isGroup) => {
    const originalSender =
      msg.from === userId ? "You" : selectedUser?.username || "Someone";
    const forwardedContent = `Forwarded from ${originalSender}: ${msg.content}`;
    if (!isGroup) {
      socket.emit("send_message", {
        from: userId,
        to: destinationId,
        content: forwardedContent,
        timestamp: new Date().toISOString(),
        replyTo: null,
      });
    } else {
      socket.emit("send_group_message", {
        groupId: destinationId,
        from: userId,
        content: forwardedContent,
        replyTo: null,
      });
    }
    toast.success("Message forwarded");
    setForwardModalMessage(null);
  };

  const handlePinMessage = async (msg, chatType, chatId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${url}/api/pinned/pin`,
        { messageId: msg._id, messageType: "Message", chatId, chatType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Message pinned");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to pin");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleGroupCreated = (newGroup) => {
    setGroups((prev) => [newGroup, ...prev]);
    setActiveTab("groups");
    toast.success(`Group "${newGroup.name}" created!`);
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
  };

  const handleSelectUser = (nextUser) => {
    setSelectedUser(nextUser);
    setSelectedGroup(null);
    setReplyTo(null);
    setEditingMessage(null);
    setMessage("");
    setIsAtBottom(true);
  };

  const handleBackToChats = () => {
    setSelectedGroup(null);
    setSelectedUser(null);
  };

  const startCall = (type) => {
    if (!selectedUser) return;
    if (!socket || !socket.connected) {
      toast.error("Socket not connected. Please refresh.");
      return;
    }
    if (!onlineUsers.has(selectedUser._id)) {
      toast.error("User is offline. Cannot call.");
      return;
    }
    setActiveCall({
      otherUserId: selectedUser._id,
      otherUsername: selectedUser.username,
      otherImage: selectedUser.image,
      type,
      incomingSignal: null,
    });
  };

  const startGroupCall = (groupId) => {
    setActiveCall({
      otherUserId: null,
      otherUsername: "Group Call",
      otherImage: null,
      type: "video",
      incomingSignal: null,
      isGroupCall: true,
      groupCallId: groupId,
    });
  };

  const startCallFromGroup = (memberId, memberUsername, memberImage, type) => {
    setActiveCall({
      otherUserId: memberId,
      otherUsername: memberUsername,
      otherImage: memberImage,
      type,
      incomingSignal: null,
    });
  };

  const closeCall = () => setActiveCall(null);

  const handleStatusUpload = async () => {
    if (!statusMedia) return;
    setStatusUploading(true);
    const formData = new FormData();
    formData.append("media", statusMedia);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${url}/api/status/create`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Status posted!");
      setShowStatusUploadModal(false);
      setStatusMedia(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to post status");
    } finally {
      setStatusUploading(false);
    }
  };

  const openStatusViewer = (userGroup) => {
    setSelectedStatusUser(userGroup);
    setShowStatusViewer(true);
  };

  const renderMessageContent = (msg) => {
    if (msg.fileUrl) {
      if (msg.fileType?.startsWith("audio/"))
        return <AudioPlayer src={getFileUrl(msg.fileUrl)} />;
      return renderFileMessage(msg.fileUrl, msg.fileType, msg.content);
    }
    return <p className="break-words">{msg.content}</p>;
  };

  // Sorting helpers
  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const aOnline = onlineUsers.has(a._id);
      const bOnline = onlineUsers.has(b._id);
      if (aOnline !== bOnline) return aOnline ? -1 : 1;
      return a.username.localeCompare(b.username);
    });
  }, [friends, onlineUsers]);

  const sortedAllUsers = useMemo(() => {
    return allUsers
      .filter((u) => !friends.some((f) => f._id === u._id))
      .sort((a, b) => {
        const aOnline = onlineUsers.has(a._id);
        const bOnline = onlineUsers.has(b._id);
        if (aOnline !== bOnline) return aOnline ? -1 : 1;
        return a.username.localeCompare(b.username);
      });
  }, [allUsers, friends, onlineUsers]);

  const query = searchTerm.trim().toLowerCase();
  const filteredFriends = useMemo(
    () =>
      sortedFriends.filter((entry) =>
        entry.username?.toLowerCase().includes(query)
      ),
    [query, sortedFriends]
  );
  const filteredAllUsers = useMemo(
    () =>
      sortedAllUsers.filter((entry) =>
        entry.username?.toLowerCase().includes(query)
      ),
    [query, sortedAllUsers]
  );
  const filteredGroups = useMemo(
    () => groups.filter((entry) => entry.name?.toLowerCase().includes(query)),
    [groups, query]
  );
  const filteredStatusGroups = useMemo(
    () =>
      statusGroups.filter((entry) =>
        entry.user.username?.toLowerCase().includes(query)
      ),
    [query, statusGroups]
  );

  const onlineCount = useMemo(
    () => friends.filter((friend) => onlineUsers.has(friend._id)).length,
    [friends, onlineUsers]
  );

  const hasActiveConversation = Boolean(selectedUser || selectedGroup);

  const renderPrivateChat = () => (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[30px] border border-stone-200/75 bg-white/80 shadow-[0_28px_90px_rgba(28,25,23,0.12)] backdrop-blur-xl dark:border-stone-700/60 dark:bg-stone-900/70">
      {/* Header */}
      <div className="w-full border-b border-stone-200/70 bg-white/70 px-4 py-4 dark:border-stone-700/70 dark:bg-stone-950/35 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={handleBackToChats}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200/80 bg-stone-100/80 text-stone-700 transition hover:-translate-y-0.5 hover:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 lg:hidden"
              title="Back"
            >
              <FaArrowLeft size={14} />
            </button>
            <div className="relative">
              <img
                src={getImageUrl(selectedUser?.image)}
                alt={selectedUser?.username}
                onError={(e) => {
                  e.target.src = "/default-avatar.png";
                }}
                className="h-14 w-14 rounded-2xl border border-white/80 object-cover shadow-lg dark:border-stone-700/70"
              />
              <span
                className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-stone-900 ${
                  onlineUsers.has(selectedUser?._id)
                    ? "bg-emerald-500"
                    : "bg-stone-400"
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  className="truncate text-xl font-semibold text-stone-900 dark:text-stone-100"
                  style={{ fontFamily: '"Sora", sans-serif' }}
                >
                  {selectedUser?.username}
                </h2>
                {onlineUsers.has(selectedUser?._id) && (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                    Online
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => startCall("audio")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200/80 bg-stone-100/80 text-stone-700 transition hover:-translate-y-0.5 hover:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
              title="Voice call"
            >
              <FaPhone size={14} />
            </button>
            <button
              onClick={() => startCall("video")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-white transition hover:-translate-y-0.5 hover:bg-stone-700 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
              title="Video call"
            >
              <FaVideo size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="scrollbar-none min-h-0 w-full flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      >
        <div className="flex w-full flex-col gap-4">
          {messages.map((msg, index) => {
            const isOwn = msg.from === userId;
            const reactions = Object.entries(
              (msg.reactions || []).reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {})
            );
            return (
              <div
                key={msg._id || index}
                className={`message-group flex flex-col ${
                  isOwn ? "items-end" : "items-start"
                }`}
              >
                <div className="flex max-w-[92%] items-end gap-3 sm:max-w-[78%]">
                  {!isOwn && (
                    <img
                      src={getImageUrl(selectedUser?.image)}
                      alt={selectedUser?.username}
                      className="h-9 w-9 rounded-2xl object-cover shadow-sm"
                    />
                  )}
                  <div
                    className={`rounded-[24px] px-4 py-3 text-sm shadow-[0_16px_32px_rgba(28,25,23,0.08)] transition ${
                      isOwn
                        ? "rounded-br-md bg-stone-900 text-stone-50 dark:bg-amber-500 dark:text-stone-950"
                        : "rounded-bl-md border border-stone-200/70 bg-white text-stone-700 dark:border-stone-700/80 dark:bg-stone-800 dark:text-stone-100"
                    }`}
                  >
                    {msg.replyTo && (
                      <div className="mb-2 rounded-2xl border border-current/15 bg-black/5 px-3 py-2 text-xs opacity-80 dark:bg-white/5">
                        Replying to: {msg.replyTo.content?.substring(0, 40)}
                      </div>
                    )}
                    {renderMessageContent(msg)}
                    <div className="mt-2 flex items-center justify-end gap-2 text-[11px] uppercase tracking-[0.18em] opacity-70">
                      <span>{formatTime(msg.timestamp)}</span>
                      {msg.edited && <span>Edited</span>}
                      {isOwn && msg.read && (
                        <span className="inline-flex items-center gap-1">
                          <FaCheckDouble size={12} /> Read
                        </span>
                      )}
                    </div>
                    {reactions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {reactions.map(([emoji, count]) => (
                          <span
                            key={emoji}
                            className="rounded-full border border-black/10 bg-black/5 px-2.5 py-1 text-xs dark:border-white/10 dark:bg-white/10"
                          >
                            {emoji} {count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {isOwn && (
                    <img
                      src={getImageUrl(image)}
                      alt={username}
                      className="h-9 w-9 rounded-2xl object-cover shadow-sm"
                    />
                  )}
                </div>
                {isOwn ? (
                  <div className="mt-2 flex gap-2 opacity-70 transition group-hover:opacity-100">
                    {!msg.fileUrl && (
                      <button
                        onClick={() => {
                          setEditingMessage(msg);
                          setMessage(msg.content);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:-translate-y-0.5 hover:text-stone-950 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-white"
                        title="Edit"
                      >
                        <FaEdit size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => setForwardModalMessage(msg)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:-translate-y-0.5 hover:text-stone-950 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-white"
                      title="Forward"
                    >
                      <FaForward size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(msg._id)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:-translate-y-0.5 dark:border-red-900/60 dark:bg-red-950/30"
                      title="Delete"
                    >
                      <FaTrash size={12} />
                    </button>
                    <button
                      onClick={() => setReplyTo(msg)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:-translate-y-0.5 hover:text-stone-950 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-white"
                      title="Reply"
                    >
                      <FaReply size={12} />
                    </button>
                    <button
                      onClick={() =>
                        handlePinMessage(msg, "private", selectedUser._id)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:-translate-y-0.5 hover:text-stone-950 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-white"
                      title="Pin"
                    >
                      <span className="text-xs">Pin</span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleAddReaction(msg._id, "👍")}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:-translate-y-0.5 hover:text-stone-950 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-white"
                      title="Like"
                    >
                      <FaThumbsUp size={12} />
                    </button>
                    <button
                      onClick={() => handleAddReaction(msg._id, "❤️")}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:-translate-y-0.5 hover:text-stone-950 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-white"
                      title="Love"
                    >
                      <FaHeart size={12} />
                    </button>
                    <button
                      onClick={() => handleAddReaction(msg._id, "😂")}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:-translate-y-0.5 hover:text-stone-950 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-white"
                      title="Laugh"
                    >
                      <FaLaugh size={12} />
                    </button>
                    <button
                      onClick={() => setReplyTo(msg)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:-translate-y-0.5 hover:text-stone-950 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-white"
                      title="Reply"
                    >
                      <FaReply size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {typingUser && (
            <div className="text-sm italic text-stone-500 dark:text-stone-400">
              {selectedUser?.username} is typing...
            </div>
          )}
        </div>
      </div>

      {replyTo && (
        <div className="w-full border-t border-stone-200/70 bg-stone-100/70 px-4 py-3 text-sm dark:border-stone-700/70 dark:bg-stone-800/60 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-stone-600 dark:text-stone-300">
              Replying to: {replyTo.content.substring(0, 48)}
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600 transition hover:bg-white dark:text-stone-300 dark:hover:bg-stone-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="w-full border-t border-stone-200/70 bg-white/70 px-4 py-4 dark:border-stone-700/70 dark:bg-stone-950/35 sm:px-6">
        <div className="flex w-full items-end gap-3">
          <div className="flex-1 rounded-[28px] border border-stone-200/80 bg-white px-4 py-2 shadow-sm dark:border-stone-700 dark:bg-stone-800">
            <input
              type="text"
              value={message}
              onChange={handleTyping}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                editingMessage ? "Update your message" : "Write a message"
              }
              className="w-full bg-transparent py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-100 dark:placeholder:text-stone-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <FileUploader onSend={handleSendFile} disabled={!selectedUser} />
            <VoiceRecorder onSend={handleSendVoice} isSending={sendingVoice} />
            <button
              onClick={handleSendMessage}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-white transition hover:-translate-y-0.5 hover:bg-stone-700 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
              title={editingMessage ? "Update message" : "Send message"}
            >
              {editingMessage ? (
                <span className="text-xs font-semibold uppercase tracking-[0.12em]">
                  Save
                </span>
              ) : (
                <FaPaperPlane size={14} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!user)
    return (
      <div className="flex h-screen items-center justify-center bg-stone-950 text-stone-100">
        Loading...
      </div>
    );

  return (
    <div className="relative h-screen overflow-hidden bg-[linear-gradient(160deg,#f7f2eb_0%,#eee5d8_38%,#f8f5ef_100%)] text-stone-900 dark:bg-[linear-gradient(160deg,#161411_0%,#1f1a16_45%,#12100d_100%)] dark:text-stone-100">
      <Helmet>
        <title>ConnecTalk</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          .scrollbar-none::-webkit-scrollbar { display: none; }
          .scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
          .message-group { animation: fadeUp .24s ease-out; }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </Helmet>

      <div className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-25">
        <svg className="h-full w-full">
          <defs>
            <pattern
              id="home-grid"
              width="52"
              height="52"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 52 0 L 0 0 0 52"
                fill="none"
                stroke="rgba(120,113,108,.22)"
                strokeWidth="0.8"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#home-grid)" />
        </svg>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-[-10%] h-[42%] bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.18),_transparent_60%)] blur-3xl dark:bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.13),_transparent_60%)]" />
      <div className="pointer-events-none absolute bottom-[-18%] right-[-8%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,_rgba(120,113,108,0.18),_transparent_65%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(231,221,208,0.06),_transparent_65%)]" />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      <div className="relative z-10 flex h-full gap-5 px-3 py-3 font-[Manrope] sm:px-4 sm:py-4 lg:gap-6 lg:px-5">
        <aside
          className={`${
            hasActiveConversation ? "hidden lg:flex" : "flex"
          } scrollbar-none w-full flex-col overflow-y-auto rounded-[32px] border border-stone-200/75 bg-white/70 p-4 shadow-[0_30px_90px_rgba(28,25,23,0.12)] backdrop-blur-2xl dark:border-stone-700/60 dark:bg-stone-900/60 lg:w-[370px]`}
        >
          <div className="rounded-[28px] border border-stone-200/80 bg-[linear-gradient(160deg,rgba(255,255,255,0.9),rgba(245,241,232,0.82))] p-4 shadow-sm dark:border-stone-700/70 dark:bg-[linear-gradient(160deg,rgba(28,25,23,0.7),rgba(17,24,39,0.28))]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={getImageUrl(image)}
                  alt={username}
                  onError={(e) => {
                    e.target.src = "/default-avatar.png";
                  }}
                  className="h-14 w-14 rounded-2xl border border-white object-cover shadow-md dark:border-stone-700/70"
                />
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">
                    Workspace
                  </p>
                  <h1
                    className="truncate text-2xl font-semibold text-stone-900 dark:text-stone-100"
                    style={{ fontFamily: '"Sora", sans-serif' }}
                  >
                    {username}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCallHistory(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200/80 bg-stone-100/80 text-stone-700 transition hover:-translate-y-0.5 hover:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                  title="Call history"
                >
                  <FaHistory size={14} />
                </button>
                <button
                  onClick={toggleTheme}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200/80 bg-stone-100/80 text-stone-700 transition hover:-translate-y-0.5 hover:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-amber-300"
                  title="Toggle theme"
                >
                  {theme === "light" ? (
                    <FaMoon size={14} />
                  ) : (
                    <FaSun size={14} />
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-900 text-white transition hover:-translate-y-0.5 hover:bg-stone-700 dark:bg-red-500 dark:text-white dark:hover:bg-red-400"
                  title="Logout"
                >
                  <FaSignOutAlt size={14} />
                </button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <StatTile label="Friends" value={friends.length} />
              <StatTile label="Groups" value={groups.length} />
              <StatTile label="Online" value={onlineCount} />
            </div>
          </div>

          <div className="mt-4 rounded-[28px] border border-stone-200/75 bg-white/70 p-2 shadow-sm dark:border-stone-700/60 dark:bg-stone-950/25">
            <div className="grid grid-cols-4 gap-2">
              {navigationTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                      active
                        ? "bg-stone-900 text-white shadow-md dark:bg-amber-500 dark:text-stone-950"
                        : "text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Icon size={14} />
                      <span className="text-[11px]">{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative mt-4">
            <FaSearch
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
              size={14}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={`Search ${
                activeTab === "chats" ? "friends" : activeTab
              }`}
              className="w-full rounded-2xl border border-stone-200/80 bg-white/80 py-3 pl-11 pr-4 text-sm text-stone-900 outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-100 dark:focus:border-stone-500 dark:focus:ring-stone-700"
            />
          </div>

          {activeTab === "chats" && friendRequests.length > 0 && (
            <div className="mt-4 rounded-[28px] border border-stone-200/75 bg-white/75 p-4 shadow-sm dark:border-stone-700/60 dark:bg-stone-950/30">
              <div className="mb-3 flex items-center justify-between">
                <h2
                  className="text-lg font-semibold text-stone-900 dark:text-stone-100"
                  style={{ fontFamily: '"Sora", sans-serif"' }}
                >
                  Requests
                </h2>
                <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                  {friendRequests.length}
                </span>
              </div>
              <div className="space-y-3">
                {friendRequests.map((request) => (
                  <div
                    key={request._id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200/70 bg-stone-50/80 p-3 dark:border-stone-700 dark:bg-stone-800/70"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={getImageUrl(request.from?.image)}
                        alt={request.from?.username}
                        className="h-10 w-10 rounded-2xl object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-stone-900 dark:text-stone-100">
                          {request.from?.username}
                        </p>
                        <p className="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                          Pending
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAcceptRequest(request._id)}
                      className="rounded-2xl bg-stone-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-stone-700 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
                    >
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "groups" && (
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="mt-4 flex items-center justify-center gap-2 rounded-[24px] bg-stone-900 px-4 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:-translate-y-0.5 hover:bg-stone-700 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
            >
              <FaPlus size={12} /> <span>Create Group</span>
            </button>
          )}

          {activeTab === "status" && (
            <button
              onClick={() => setShowStatusUploadModal(true)}
              className="mt-4 flex items-center justify-center gap-2 rounded-[24px] bg-stone-900 px-4 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:-translate-y-0.5 hover:bg-stone-700 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
            >
              <FaPlus size={12} /> <span>Add Status</span>
            </button>
          )}

          <div className="scrollbar-none mt-4 flex-1 overflow-y-auto pr-1">
            {activeTab === "chats" && (
              <div className="space-y-3">
                {filteredFriends.length > 0 ? (
                  filteredFriends.map((friend) => {
                    const active = selectedUser?._id === friend._id;
                    return (
                      <button
                        key={friend._id}
                        onClick={() => handleSelectUser(friend)}
                        className={`w-full rounded-[26px] border p-4 text-left transition ${
                          active
                            ? "border-stone-900 bg-stone-900 text-white shadow-xl dark:border-amber-500 dark:bg-amber-500 dark:text-stone-950"
                            : "border-stone-200/80 bg-white/75 hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white dark:border-stone-700/70 dark:bg-stone-900/55 dark:hover:border-stone-500 dark:hover:bg-stone-900/75"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="relative">
                              <img
                                src={getImageUrl(friend.image)}
                                alt={friend.username}
                                className="h-12 w-12 rounded-2xl object-cover"
                              />
                              <span
                                className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 ${
                                  active
                                    ? "border-stone-900 dark:border-amber-500"
                                    : "border-white dark:border-stone-900"
                                } ${
                                  onlineUsers.has(friend._id)
                                    ? "bg-emerald-500"
                                    : "bg-stone-400"
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-semibold">
                                {friend.username}
                              </div>
                              <div
                                className={`mt-1 text-xs uppercase tracking-[0.18em] ${
                                  active
                                    ? "text-stone-200 dark:text-stone-800"
                                    : "text-stone-500 dark:text-stone-400"
                                }`}
                              >
                                {onlineUsers.has(friend._id)
                                  ? "Available now"
                                  : "Offline"}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFriend(friend._id);
                            }}
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                              active
                                ? "bg-white/15 text-white dark:bg-stone-950/15 dark:text-stone-900"
                                : "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                            title="Remove friend"
                          >
                            <FaUserMinus size={13} />
                          </button>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <EmptyStateCard
                    title="No friends yet"
                    description="Add friends from the 'Find Friends' tab to start chatting."
                    icon={FaUsers}
                  />
                )}
              </div>
            )}

            {activeTab === "find" && (
              <div className="space-y-3">
                {filteredAllUsers.length > 0 ? (
                  filteredAllUsers.map((userEntry) => {
                    const requestSent = sentRequestIds.has(userEntry._id);
                    return (
                      <div
                        key={userEntry._id}
                        className="w-full rounded-[26px] border border-stone-200/80 bg-white/75 p-4 dark:border-stone-700/70 dark:bg-stone-900/55"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="relative">
                              <img
                                src={getImageUrl(userEntry.image)}
                                alt={userEntry.username}
                                className="h-12 w-12 rounded-2xl object-cover"
                              />
                              <span
                                className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-stone-900 ${
                                  onlineUsers.has(userEntry._id)
                                    ? "bg-emerald-500"
                                    : "bg-stone-400"
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-semibold">
                                {userEntry.username}
                              </div>
                              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                                {onlineUsers.has(userEntry._id)
                                  ? "Available now"
                                  : "Offline"}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handleSendFriendRequest(userEntry._id)
                            }
                            disabled={requestSent}
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                              requestSent
                                ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-stone-900 text-white hover:bg-stone-700 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
                            } ${requestSent ? "cursor-not-allowed" : ""}`}
                            title={requestSent ? "Request sent" : "Add friend"}
                          >
                            {requestSent ? (
                              <span className="text-xs font-semibold">✓</span>
                            ) : (
                              <FaUserPlus size={13} />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <EmptyStateCard
                    title="No users found"
                    description="Try another search term or invite new users."
                    icon={FaUserPlus}
                  />
                )}
              </div>
            )}

            {activeTab === "groups" && (
              <div className="space-y-3">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => {
                    const active = selectedGroup?._id === group._id;
                    return (
                      <button
                        key={group._id}
                        onClick={() => handleSelectGroup(group)}
                        className={`w-full rounded-[26px] border p-4 text-left transition ${
                          active
                            ? "border-stone-900 bg-stone-900 text-white shadow-xl dark:border-amber-500 dark:bg-amber-500 dark:text-stone-950"
                            : "border-stone-200/80 bg-white/75 hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white dark:border-stone-700/70 dark:bg-stone-900/55 dark:hover:border-stone-500 dark:hover:bg-stone-900/75"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={getImageUrl(group.avatar)}
                            alt={group.name}
                            className="h-12 w-12 rounded-2xl object-cover"
                          />
                          <div className="min-w-0">
                            <div className="truncate font-semibold">
                              {group.name}
                            </div>
                            <div
                              className={`mt-1 text-xs uppercase tracking-[0.18em] ${
                                active
                                  ? "text-stone-200 dark:text-stone-800"
                                  : "text-stone-500 dark:text-stone-400"
                              }`}
                            >
                              {group.members?.length || 0} members
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <EmptyStateCard
                    title="No groups yet"
                    description="Create a focused group for projects or teams."
                    icon={FaUsers}
                    action={
                      <button
                        onClick={() => setShowCreateGroupModal(true)}
                        className="mt-5 rounded-2xl bg-stone-900 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-stone-700 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
                      >
                        Create Group
                      </button>
                    }
                  />
                )}
              </div>
            )}

            {activeTab === "status" && (
              <div className="space-y-3">
                {filteredStatusGroups.length > 0 ? (
                  filteredStatusGroups.map((group, index) => (
                    <button
                      key={`${group.user._id}-${index}`}
                      onClick={() => openStatusViewer(group)}
                      className="w-full rounded-[26px] border border-stone-200/80 bg-white/75 p-4 text-left transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white dark:border-stone-700/70 dark:bg-stone-900/55 dark:hover:border-stone-500 dark:hover:bg-stone-900/75"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-[20px] bg-[linear-gradient(135deg,#f59e0b,#fcd34d)] p-[2px]">
                          <img
                            src={getImageUrl(group.user.image)}
                            alt={group.user.username}
                            className="h-12 w-12 rounded-[18px] border border-white object-cover dark:border-stone-900"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-stone-900 dark:text-stone-100">
                            {group.user.username}
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                            {group.statuses.length} update
                            {group.statuses.length === 1 ? "" : "s"}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <EmptyStateCard
                    title="No status updates"
                    description="When your contacts share images or videos, they will appear here."
                    icon={FaBroadcastTower}
                  />
                )}
              </div>
            )}
          </div>
        </aside>

        <main className="flex h-full min-h-0 min-w-0 flex-1">
          {selectedGroup ? (
            <div className="flex h-full min-h-0 w-full overflow-hidden rounded-[32px] border border-stone-200/75 bg-white/70 shadow-[0_30px_90px_rgba(28,25,23,0.12)] backdrop-blur-2xl dark:border-stone-700/60 dark:bg-stone-900/55">
              <GroupChat
                group={selectedGroup}
                userId={userId}
                currentUsername={username}
                currentUserImage={image}
                onStartGroupCall={startGroupCall}
                onClose={handleBackToChats}
                onGroupUpdated={(updated) => {
                  if (updated) setSelectedGroup(updated);
                  fetchData();
                }}
                onStartCall={startCallFromGroup}
              />
            </div>
          ) : selectedUser ? (
            <div className="flex h-full min-h-0 w-full overflow-hidden">
              {renderPrivateChat()}
            </div>
          ) : (
            <div className="flex min-h-0 w-full items-center justify-center overflow-y-auto py-2">
              <div className="w-full max-w-3xl rounded-[34px] border border-stone-200/75 bg-white/72 p-8 shadow-[0_30px_90px_rgba(28,25,23,0.12)] backdrop-blur-2xl dark:border-stone-700/60 dark:bg-stone-900/58">
                <h2
                  className="text-4xl font-semibold leading-tight text-stone-900 dark:text-stone-100 sm:text-5xl"
                  style={{ fontFamily: '"Sora", sans-serif' }}
                >
                  Welcome back, {username}
                </h2>
                <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-300">
                  All your conversations, groups and status updates live here.
                  Select a friend from the left to start messaging.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <EmptyStateCard
                    title="Friends"
                    description="Chat privately with your accepted friends."
                    icon={FaUsers}
                  />
                  <EmptyStateCard
                    title="Groups"
                    description="Collaborate in group conversations."
                    icon={FaUsers}
                  />
                  <EmptyStateCard
                    title="Status"
                    description="Share what's new with your circle."
                    icon={FaBroadcastTower}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onGroupCreated={handleGroupCreated}
        userId={userId}
      />
      {showStatusViewer && selectedStatusUser && (
        <StatusViewer
          statuses={selectedStatusUser.statuses}
          onClose={() => {
            setShowStatusViewer(false);
            setSelectedStatusUser(null);
            fetchData();
          }}
        />
      )}
      {showStatusUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[30px] border border-stone-200/80 bg-white/90 p-6 shadow-2xl dark:border-stone-700 dark:bg-stone-900/90">
            <h3
              className="text-2xl font-semibold text-stone-900 dark:text-stone-100"
              style={{ fontFamily: '"Sora", sans-serif' }}
            >
              Post a status
            </h3>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Upload an image or short video update for your contacts.
            </p>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(event) => setStatusMedia(event.target.files[0])}
              className="mt-5 w-full text-sm text-stone-600 file:mr-4 file:rounded-2xl file:border-0 file:bg-stone-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white dark:text-stone-300 dark:file:bg-amber-500 dark:file:text-stone-950"
            />
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleStatusUpload}
                disabled={!statusMedia || statusUploading}
                className="flex-1 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
              >
                {statusUploading ? "Posting..." : "Post"}
              </button>
              <button
                onClick={() => {
                  setShowStatusUploadModal(false);
                  setStatusMedia(null);
                }}
                className="flex-1 rounded-2xl border border-stone-200 bg-stone-100 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-stone-700 transition hover:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {activeCall && (
        <CallManager
          socket={socket}
          userId={userId}
          otherUserId={activeCall.otherUserId}
          otherUsername={activeCall.otherUsername}
          otherImage={activeCall.otherImage}
          callType={activeCall.type}
          incomingSignal={activeCall.incomingSignal}
          isGroupCall={activeCall.isGroupCall || false}
          groupCallId={activeCall.groupCallId}
          onClose={closeCall}
        />
      )}
      {showCallHistory && (
        <CallHistory
          userId={userId}
          onClose={() => setShowCallHistory(false)}
        />
      )}
      {forwardModalMessage && (
        <ForwardModal
          message={forwardModalMessage}
          currentUserId={userId}
          onClose={() => setForwardModalMessage(null)}
          onForward={handleForwardConfirm}
        />
      )}
      <ConfirmModal
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => confirmDialog.onConfirm && confirmDialog.onConfirm()}
        onCancel={() =>
          setConfirmDialog({
            open: false,
            title: "",
            message: "",
            onConfirm: null,
          })
        }
      />
    </div>
  );
}
