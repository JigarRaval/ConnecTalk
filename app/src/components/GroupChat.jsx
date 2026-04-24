import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import io from "socket.io-client";
import toast from "react-hot-toast";
import {
  FaArrowLeft,
  FaUsers,
  FaPhone,
  FaVideo,
  FaTrash,
  FaEdit,
  FaReply,
  FaForward,
  FaThumbsUp,
  FaHeart,
  FaLaugh,
  FaPaperPlane,
  FaMicrophone,
  FaFileUpload,
  FaEllipsisV,
  FaCheck,
  FaTimes,
  FaUserPlus,
  FaDoorOpen,
} from "react-icons/fa";
import VoiceRecorder from "./VoiceRecorder";
import FileUploader from "./FileUploader";
import AudioPlayer from "./AudioPlayer";
import ForwardModal from "./ForwardModal";
import { buildImageUrl, buildUploadUrl } from "../utils/media";

const url = import.meta.env.VITE_URL || "http://localhost:5000";
let socket;

const getFileUrl = (filePath) => buildUploadUrl(filePath);

const getImageUrl = (imagePath) => buildImageUrl(imagePath);

const renderFileMessage = (fileUrl, fileType, fileName) => {
  const fullUrl = getFileUrl(fileUrl);
  if (!fullUrl) return <p className="text-red-500">File unavailable</p>;

  if (fileType?.startsWith("image/")) {
    return (
      <div className="max-w-xs">
        <img
          src={fullUrl}
          alt="shared"
          className="rounded-lg max-w-full max-h-64 object-contain cursor-pointer"
          onClick={() => window.open(fullUrl, "_blank")}
          onError={(e) => (e.target.src = "/default-avatar.png")}
        />
        <a
          href={fullUrl}
          download={fileName || "download"}
          className="mt-1 block text-xs text-amber-700 hover:underline dark:text-amber-300"
        >
          Download
        </a>
      </div>
    );
  } else if (fileType?.startsWith("video/")) {
    return (
      <div>
        <video controls className="max-w-xs max-h-64 rounded-lg">
          <source src={fullUrl} type={fileType} />
        </video>
        <a
          href={fullUrl}
          download={fileName || "video.mp4"}
          className="mt-1 block text-xs text-amber-700 hover:underline dark:text-amber-300"
        >
          Download
        </a>
      </div>
    );
  } else if (fileType?.startsWith("audio/")) {
    return <AudioPlayer src={fullUrl} />;
  } else {
    return (
      <a
        href={fullUrl}
        download={fileName || "file"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-amber-700 underline dark:text-amber-300"
      >
        📄 {fileName || "Download file"}
      </a>
    );
  }
};

const GroupChat = ({
  group,
  userId,
  currentUsername,
  currentUserImage,
  onClose,
  onGroupUpdated,
  onStartCall,
  onStartGroupCall,
}) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [groupInfo, setGroupInfo] = useState(group);
  const [showMembers, setShowMembers] = useState(false);
  const [newMemberSearch, setNewMemberSearch] = useState("");
  const [sendingVoice, setSendingVoice] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [forwardModalMessage, setForwardModalMessage] = useState(null);
  const [allFriends, setAllFriends] = useState([]);

  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollMessagesToBottom = useCallback((behavior = "auto") => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  const renderMessageWithMentions = (text) => {
    if (!text) return text;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        const username = part.slice(1);
        const isCurrentUser = username === currentUsername;
        return (
          <span
            key={idx}
            className={`font-semibold ${
              isCurrentUser ? "text-amber-300" : "text-stone-300 dark:text-amber-200"
            }`}
          >
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Initialize socket
  useEffect(() => {
    socket = io(url, { autoConnect: true });
    socket.emit("join_group", group._id);

    socket.on("user_online", (id) =>
      setOnlineUsers((prev) => new Set([...prev, id]))
    );
    socket.on("user_offline", (id) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    });

    return () => {
      socket.emit("leave_group", group._id);
      socket.disconnect();
    };
  }, [group._id]);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${url}/api/groups/${group._id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(res.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load messages");
      }
    };
    fetchMessages();
  }, [group._id]);

  // Fetch friends for member add
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${url}/api/auth/friends`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllFriends(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchFriends();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("group_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("group_typing", ({ user, isTyping, username }) => {
      if (isTyping) {
        setTypingUsers((prev) => {
          if (prev.find((u) => u.userId === user)) return prev;
          return [...prev, { userId: user, username }];
        });
      } else {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== user));
      }
    });

    socket.on("group_message_edited", ({ messageId, newContent }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, content: newContent, edited: true }
            : msg
        )
      );
    });

    socket.on("group_message_deleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    });

    socket.on("group_reaction_updated", ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, reactions } : msg))
      );
    });

    socket.on("member_added", () => {
      toast.success("New member joined");
      onGroupUpdated?.();
    });

    socket.on("member_removed", ({ userId: removedUserId }) => {
      if (removedUserId === userId) {
        toast.info("You were removed");
        onClose();
      } else {
        toast.info("Member left");
        onGroupUpdated?.();
      }
    });

    socket.on("member_left", ({ userId: leftUserId }) => {
      if (leftUserId === userId) {
        toast.info("You left");
        onClose();
      } else {
        toast.info("Member left");
        onGroupUpdated?.();
      }
    });

    socket.on("group_updated", (updatedGroup) => {
      setGroupInfo(updatedGroup);
      onGroupUpdated?.(updatedGroup);
    });

    socket.on("group_deleted", () => {
      toast.error("Group deleted");
      onClose();
    });

    socket.on(
      "mention_notification",
      ({ from, groupId, groupName, messagePreview }) => {
        toast(`🔔 You were mentioned in ${groupName}: ${messagePreview}`, {
          duration: 5000,
          icon: "🔔",
        });
      }
    );

    return () => {
      socket.off("group_message");
      socket.off("group_typing");
      socket.off("group_message_edited");
      socket.off("group_message_deleted");
      socket.off("group_reaction_updated");
      socket.off("member_added");
      socket.off("member_removed");
      socket.off("member_left");
      socket.off("group_updated");
      socket.off("group_deleted");
      socket.off("user_online");
      socket.off("user_offline");
      socket.off("mention_notification");
    };
  }, [userId, onClose, onGroupUpdated]);

  // Auto-scroll
  useEffect(() => {
    if (!isAtBottom) return undefined;

    const frame = requestAnimationFrame(() =>
      scrollMessagesToBottom(messages.length > 0 ? "smooth" : "auto")
    );

    return () => cancelAnimationFrame(frame);
  }, [isAtBottom, messages, scrollMessagesToBottom]);

  useEffect(() => {
    setIsAtBottom(true);
  }, [group._id]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setIsAtBottom(scrollHeight - scrollTop <= clientHeight + 10);
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (!typing) {
      setTyping(true);
      socket.emit("group_typing", {
        groupId: group._id,
        user: userId,
        username: currentUsername,
        isTyping: true,
      });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      socket.emit("group_typing", {
        groupId: group._id,
        user: userId,
        username: currentUsername,
        isTyping: false,
      });
    }, 1000);
  };

  const handleSendMessage = () => {
    if (!message.trim() && !editingMessage) return;
    if (editingMessage) {
      socket.emit("edit_group_message", {
        messageId: editingMessage._id,
        newContent: message,
        userId,
      });
      setEditingMessage(null);
      setMessage("");
      return;
    }
    const msg = {
      groupId: group._id,
      from: userId,
      content: message,
      replyTo: replyTo?._id || null,
    };
    socket.emit("send_group_message", msg);
    setMessage("");
    setReplyTo(null);
  };

  const handleSendVoice = (voiceUrl, fileType) => {
    socket.emit("send_group_message", {
      groupId: group._id,
      from: userId,
      content: "🎤 Voice message",
      fileUrl: voiceUrl,
      fileType,
    });
  };

  const handleSendFile = (fileUrl, fileType, originalName) => {
    socket.emit("send_group_message", {
      groupId: group._id,
      from: userId,
      content: originalName || "📎 File",
      fileUrl,
      fileType,
    });
  };

  const handleDeleteMessage = (messageId) => {
    if (window.confirm("Delete message?"))
      socket.emit("delete_group_message", { messageId, userId });
  };

  const handleAddReaction = (messageId, emoji) =>
    socket.emit("add_group_reaction", { messageId, userId, emoji });

  const handleLeaveGroup = async () => {
    if (window.confirm("Leave group?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.post(
          `${url}/api/groups/${group._id}/leave`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Left group");
        onClose();
      } catch (err) {
        toast.error("Failed to leave");
      }
    }
  };

  const handleDeleteGroup = async () => {
    if (window.confirm("Delete group permanently?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${url}/api/groups/${group._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Group deleted");
        onClose();
      } catch (err) {
        toast.error("Failed to delete");
      }
    }
  };

  const handleAddMember = async (friendId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${url}/api/groups/${group._id}/add-member`,
        { userId: friendId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Member added");
      setNewMemberSearch("");
      onGroupUpdated?.();
    } catch (err) {
      toast.error("Failed to add member");
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Remove member?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${url}/api/groups/${group._id}/remove-member/${memberId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Member removed");
      onGroupUpdated?.();
    } catch (err) {
      toast.error("Failed to remove");
    }
  };

  const startGroupCall = () => {
    if (onStartGroupCall) onStartGroupCall(group._id);
  };

  const handleForwardConfirm = (msg, destinationId, isGroup) => {
    const originalSender =
      msg.from?._id === userId ? "You" : msg.from?.username || "Someone";
    const forwardedContent = `📨 Forwarded from ${originalSender}: ${msg.content}`;

    if (!isGroup) {
      const forwardMsg = {
        from: userId,
        to: destinationId,
        content: forwardedContent,
        timestamp: new Date().toISOString(),
        replyTo: null,
      };
      socket.emit("send_message", forwardMsg);
    } else {
      const forwardMsg = {
        groupId: destinationId,
        from: userId,
        content: forwardedContent,
        replyTo: null,
      };
      socket.emit("send_group_message", forwardMsg);
    }
    toast.success("Message forwarded");
    setForwardModalMessage(null);
  };

  const renderMessageContent = (msg) => {
    if (msg.fileUrl) {
      if (msg.fileType?.startsWith("audio/"))
        return <AudioPlayer src={getFileUrl(msg.fileUrl)} />;
      return renderFileMessage(msg.fileUrl, msg.fileType, msg.content);
    }
    return (
      <p className="break-words">{renderMessageWithMentions(msg.content)}</p>
    );
  };

  const isAdmin = groupInfo?.admins?.some((admin) => admin._id === userId);
  const currentUserIsMember = groupInfo?.members?.some((m) => m._id === userId);

  if (!currentUserIsMember) return null;

  const availableFriends = allFriends.filter(
    (friend) => !groupInfo?.members?.some((m) => m._id === friend._id)
  );
  const filteredFriends = availableFriends.filter((f) =>
    f.username.toLowerCase().includes(newMemberSearch.toLowerCase())
  );

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col bg-transparent">
      {/* Header */}
      <div className="w-full border-b border-stone-200/70 bg-white/60 p-4 shadow-sm backdrop-blur-sm dark:border-stone-700/70 dark:bg-stone-950/25">
        <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onClose}
            className="mr-3 rounded-2xl border border-stone-200 bg-stone-100 p-2 transition-all hover:scale-105 hover:bg-white dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700"
          >
            <FaArrowLeft className="text-stone-600 dark:text-stone-300" />
          </button>
          <img
            src={getImageUrl(groupInfo?.avatar)}
            onError={(e) => (e.target.src = "/default-avatar.png")}
            className="mr-3 h-10 w-10 rounded-2xl object-cover"
          />
          <div>
            <h2 className="font-bold text-stone-800 dark:text-stone-100">
              {groupInfo?.name}
            </h2>
            <p className="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
              {groupInfo?.members?.length} members
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={startGroupCall}
            className="rounded-2xl bg-stone-900 p-2 text-white shadow-md transition-all hover:scale-105 hover:bg-stone-700 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
            title="Group call"
          >
            <FaPhone />
          </button>
          <button
            onClick={() => setShowMembers(!showMembers)}
            className={`p-2 rounded-full transition-all hover:scale-105 ${
              showMembers
                ? "bg-stone-900 text-white dark:bg-amber-500 dark:text-stone-950"
                : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200"
            }`}
            title="Members"
          >
            <FaUsers />
          </button>
          {isAdmin && (
            <button
              onClick={handleDeleteGroup}
              className="rounded-2xl bg-red-100 p-2 text-red-600 transition-all hover:scale-105 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50"
              title="Delete group"
            >
              <FaTrash />
            </button>
          )}
          <button
            onClick={handleLeaveGroup}
            className="rounded-2xl bg-stone-100 p-2 text-stone-700 transition-all hover:scale-105 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
            title="Leave group"
          >
            <FaDoorOpen />
          </button>
        </div>
        </div>
      </div>

      {/* Members Sidebar */}
      {showMembers && (
        <div className="scrollbar-hide absolute right-4 top-20 z-10 max-h-[calc(100vh-100px)] w-80 overflow-y-auto rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md animate-fade-in dark:border-stone-700 dark:bg-stone-800/95">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FaUsers className="text-amber-600 dark:text-amber-300" /> Members (
              {groupInfo?.members?.length})
            </h3>
            <button
              onClick={() => setShowMembers(false)}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <FaTimes />
            </button>
          </div>

          <div className="space-y-2">
            {groupInfo?.members?.map((member) => (
              <div
                key={member._id}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative">
                    <img
                      src={getImageUrl(member.image)}
                      className="w-8 h-8 rounded-full object-cover"
                      alt={member.username}
                    />
                    {onlineUsers.has(member._id) && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white dark:border-gray-800" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                      {member.username}
                    </p>
                    {groupInfo.admins.some((a) => a._id === member._id) && (
                      <span className="text-xs text-amber-700 dark:text-amber-300">Admin</span>
                    )}
                  </div>
                </div>
                {member._id !== userId && (
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        onStartCall?.(
                          member._id,
                          member.username,
                          member.image,
                          "audio"
                        )
                      }
                      className="p-1.5 rounded-full bg-green-500 text-white hover:scale-105 transition"
                      title="Voice call"
                    >
                      <FaPhone size={10} />
                    </button>
                    <button
                      onClick={() =>
                        onStartCall?.(
                          member._id,
                          member.username,
                          member.image,
                          "video"
                        )
                      }
                      className="rounded-full bg-stone-900 p-1.5 text-white transition hover:scale-105 hover:bg-stone-700 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
                      title="Video call"
                    >
                      <FaVideo size={10} />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleRemoveMember(member._id)}
                        className="p-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 transition"
                        title="Remove"
                      >
                        <FaTrash size={10} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Add Member
              </label>
              <input
                type="text"
                placeholder="Search friends..."
                value={newMemberSearch}
                onChange={(e) => setNewMemberSearch(e.target.value)}
                className="mb-2 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 dark:border-stone-600 dark:bg-stone-800/50 dark:text-white dark:focus:ring-stone-700"
              />
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredFriends.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-2">
                    No friends to add
                  </p>
                ) : (
                  filteredFriends.map((friend) => (
                    <div
                      key={friend._id}
                      onClick={() => handleAddMember(friend._id)}
                      className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                      <img
                        src={getImageUrl(friend.image)}
                        className="w-6 h-6 rounded-full"
                        alt={friend.username}
                      />
                      <span className="text-sm flex-1">{friend.username}</span>
                      <FaUserPlus className="text-green-500 text-xs" />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="scrollbar-hide min-h-0 w-full flex-1 overflow-y-auto p-4 space-y-3"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {messages.map((msg, idx) => (
          <div
            key={msg._id || idx}
            className={`flex flex-col ${
              msg.from?._id === userId ? "items-end" : "items-start"
            } animate-fade-in`}
          >
            <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
              {msg.from?._id !== userId && (
                <img
                  src={getImageUrl(msg.from?.image)}
                  className="w-8 h-8 rounded-full object-cover"
                  alt={msg.from?.username}
                />
              )}
              <div
                className={`px-4 py-2 rounded-2xl shadow relative group transition-all hover:shadow-md ${
                  msg.from?._id === userId
                    ? "bg-stone-900 text-white rounded-br-none dark:bg-amber-500 dark:text-stone-950"
                    : "bg-white text-gray-800 rounded-bl-none border border-stone-200/70 dark:border-stone-700/80 dark:bg-stone-800 dark:text-white"
                }`}
              >
                {msg.from?._id !== userId && (
                  <div className="text-xs font-semibold mb-1 opacity-80">
                    {msg.from?.username}
                  </div>
                )}
                {msg.replyTo && (
                  <div className="text-xs opacity-70 mb-1 border-l-2 pl-2">
                    Replying to: {msg.replyTo.content?.substring(0, 40)}
                  </div>
                )}
                {renderMessageContent(msg)}
                <div className="flex items-center justify-end gap-2 mt-1">
                  <span className="text-xs opacity-70">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {msg.edited && " ✏️"}
                  </span>
                </div>
                {msg.reactions?.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {Object.entries(
                      msg.reactions.reduce((acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([emoji, count]) => (
                      <span
                        key={emoji}
                        className="text-xs bg-gray-300 dark:bg-gray-600 rounded-full px-1"
                      >
                        {emoji} {count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {msg.from?._id === userId && (
                <img
                  src={getImageUrl(currentUserImage)}
                  className="w-8 h-8 rounded-full object-cover"
                  alt="You"
                />
              )}
            </div>
            {msg.from?._id === userId && (
              <div className="flex gap-2 mt-1 text-xs opacity-0 group-hover:opacity-100 transition-all">
                {!msg.fileUrl && (
                  <button
                    onClick={() => {
                      setEditingMessage(msg);
                      setMessage(msg.content);
                    }}
                    className="text-amber-700 transition hover:scale-110 dark:text-amber-300"
                  >
                    <FaEdit />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteMessage(msg._id)}
                  className="text-red-500 hover:scale-110 transition"
                >
                  <FaTrash />
                </button>
                <button
                  onClick={() => setReplyTo(msg)}
                  className="text-gray-500 hover:scale-110 transition"
                >
                  <FaReply />
                </button>
                <button
                  onClick={() => setForwardModalMessage(msg)}
                  className="text-gray-500 hover:scale-110 transition"
                >
                  <FaForward />
                </button>
              </div>
            )}
            {msg.from?._id !== userId && (
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => handleAddReaction(msg._id, "👍")}
                  className="hover:scale-110 transition"
                >
                  <FaThumbsUp size={12} />
                </button>
                <button
                  onClick={() => handleAddReaction(msg._id, "❤️")}
                  className="hover:scale-110 transition"
                >
                  <FaHeart size={12} />
                </button>
                <button
                  onClick={() => handleAddReaction(msg._id, "😂")}
                  className="hover:scale-110 transition"
                >
                  <FaLaugh size={12} />
                </button>
                <button
                  onClick={() => setReplyTo(msg)}
                  className="text-gray-500 hover:scale-110 transition"
                >
                  <FaReply size={12} />
                </button>
                <button
                  onClick={() => setForwardModalMessage(msg)}
                  className="text-gray-500 hover:scale-110 transition"
                >
                  <FaForward size={12} />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-sm italic text-stone-500 animate-pulse dark:text-stone-400">
            <div className="flex -space-x-2">
              {typingUsers.slice(0, 3).map((u) => (
                <img
                  key={u.userId}
                  src={getImageUrl(
                    groupInfo?.members?.find((m) => m._id === u.userId)?.image
                  )}
                  className="w-6 h-6 rounded-full border border-white dark:border-gray-800"
                  alt={u.username}
                  onError={(e) => (e.target.src = "/default-avatar.png")}
                />
              ))}
            </div>
            <span>
              {typingUsers.length === 1 &&
                `${typingUsers[0].username} is typing...`}
              {typingUsers.length === 2 &&
                `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`}
              {typingUsers.length > 2 &&
                `${typingUsers.length} people are typing...`}
            </span>
          </div>
        )}
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="w-full border-t border-stone-200 bg-stone-100/80 px-4 py-2 text-sm backdrop-blur-sm dark:border-stone-700 dark:bg-stone-800/80">
          <div className="flex items-center justify-between">
          <span className="text-stone-600 dark:text-stone-300">
            Replying to: {replyTo.content?.substring(0, 50)}...
          </span>
          <button
            onClick={() => setReplyTo(null)}
            className="text-red-500 hover:scale-110 transition"
          >
            <FaTimes />
          </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="w-full border-t border-stone-200 bg-white/60 p-3 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-950/25">
        <div className="flex w-full items-center gap-2">
        <input
          type="text"
          value={message}
          onChange={handleTyping}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder={
            editingMessage ? "Edit message..." : "Type group message..."
          }
          className="flex-1 rounded-full border border-stone-300 px-4 py-2 transition-all focus:outline-none focus:ring-2 focus:ring-stone-300 dark:border-stone-600 dark:bg-stone-700 dark:text-white dark:focus:ring-stone-700"
        />
        <FileUploader onSend={handleSendFile} disabled={false} />
        <VoiceRecorder onSend={handleSendVoice} isSending={sendingVoice} />
        <button
          onClick={handleSendMessage}
          className="rounded-full bg-stone-900 px-5 py-2 text-white shadow-md transition-all hover:scale-105 hover:bg-stone-700 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
        >
          {editingMessage ? <FaEdit /> : <FaPaperPlane />}
        </button>
        </div>
      </div>

      {/* Forward Modal */}
      {forwardModalMessage && (
        <ForwardModal
          message={forwardModalMessage}
          currentUserId={userId}
          onClose={() => setForwardModalMessage(null)}
          onForward={handleForwardConfirm}
        />
      )}

      <style >{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
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
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default GroupChat;
