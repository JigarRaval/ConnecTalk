const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const Message = require("./models/Message");
const User = require("./models/User");
const Group = require("./models/Group");
const GroupMessage = require("./models/GroupMessage");
const CallLog = require("./models/CallLog"); // added
const authRoutes = require("./routes/auth");
const groupRoutes = require("./routes/groups");
const statusRoutes = require("./routes/status");
const callLogRoutes = require("./routes/callLogs");
const app = express();
const pinnedRoutes = require("./routes/pinnedMessages");
require("dotenv").config();

const PORT = process.env.PORT || 5000;
const host = process.env.HOST;
const mongoDB = process.env.MONGODB;

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: host || "*",
    methods: ["GET", "POST", "DELETE"],
  },
});

mongoose
  .connect(mongoDB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

app.use(cors({ origin: "*" }));
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(bodyParser.json());
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/call-logs", callLogRoutes);
app.use("/api/pinned", pinnedRoutes);

app.set("io", io);

const onlineUsers = new Map(); // userId -> socketId

// Track call start times and status
const callSessions = new Map(); // socketId -> { withUserId, callType, startTime, answered }

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  let currentUserId = null;

  // ========== User join ==========
  socket.on("join_room", async (userId) => {
    console.log(`User ${userId} joined room, socket: ${socket.id}`);
    currentUserId = userId;
    socket.join(userId);

    // Send currently online users to new client
    const currentlyOnline = Array.from(onlineUsers.keys()).filter(
      (id) => id !== userId
    );
    currentlyOnline.forEach((uid) => socket.emit("user_online", uid));

    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, {
      online: true,
      lastSeen: new Date(),
    });
    socket.broadcast.emit("user_online", userId);
  });

  // ========== Private Call Signaling ==========
  socket.on("call_user", ({ from, to, signalData, callerName, callType }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      // Record that this socket initiated a call
      callSessions.set(socket.id, {
        withUserId: to,
        callType,
        startTime: Date.now(),
        answered: false,
      });
      io.to(targetSocketId).emit("incoming_call", {
        from,
        signalData,
        callerName,
        callType,
      });
    } else {
      socket.emit("call_error", { message: "User offline" });
    }
  });

  socket.on("accept_call", ({ to, signalData }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call_accepted", { signalData });
      // For the callee, also record a session (if needed)
      callSessions.set(socket.id, {
        withUserId: to,
        callType: "unknown", // will be filled from caller's session later? Not needed for logging.
        startTime: Date.now(),
        answered: true,
      });
      // Mark the initiator's session as answered
      // Find the caller's session: we can't easily get it here; we'll handle in end_call.
    }
  });

  socket.on("reject_call", ({ to }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call_rejected");
    }
    // Log missed call for initiator
    const session = callSessions.get(socket.id);
    if (session) {
      const callLog = new CallLog({
        from: currentUserId,
        to: session.withUserId,
        callType: session.callType,
        status: "rejected",
        duration: 0,
        timestamp: new Date(),
      });
      callLog.save().catch(console.error);
      callSessions.delete(socket.id);
    }
  });

  socket.on("end_call", async ({ to }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call_ended");
    }
    // Log the call based on the session
    const session = callSessions.get(socket.id);
    if (session) {
      const duration = Math.floor((Date.now() - session.startTime) / 1000);
      const status = session.answered ? "answered" : "missed";
      const callLog = new CallLog({
        from: currentUserId,
        to: session.withUserId,
        callType: session.callType,
        status: status,
        duration: status === "answered" ? duration : 0,
        timestamp: new Date(),
      });
      await callLog.save().catch(console.error);
      callSessions.delete(socket.id);
    }
  });

  socket.on("ice_candidate", ({ to, candidate }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("ice_candidate", { candidate });
    }
  });

  // ========== Group Call Signaling ==========
  socket.on("start_group_call", async ({ groupId, from, callType }) => {
    const group = await Group.findById(groupId);
    if (!group) return;
    for (const memberId of group.members) {
      if (memberId.toString() !== from) {
        const targetSocketId = onlineUsers.get(memberId.toString());
        if (targetSocketId) {
          io.to(targetSocketId).emit("group_call_invitation", {
            from,
            groupId,
            callType,
          });
        }
      }
    }
  });

  socket.on("join_group_call", ({ groupId, to, signalData }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("group_call_participant_joined", {
        groupId,
        from: currentUserId,
        signalData,
      });
    }
  });

  socket.on("accept_group_call", ({ groupId, to, signalData }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("group_call_participant_joined", {
        groupId,
        from: currentUserId,
        signalData,
      });
    }
  });

  socket.on("reject_group_call", ({ groupId }) => {
    socket
      .to(`group_${groupId}`)
      .emit("group_call_rejected", { from: currentUserId });
  });

  socket.on("end_group_call", ({ groupId }) => {
    socket.to(`group_${groupId}`).emit("group_call_ended", { groupId });
  });

  // ========== Group Rooms ==========
  socket.on("join_group", (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`Socket ${socket.id} joined group room: group_${groupId}`);
  });

  socket.on("leave_group", (groupId) => {
    socket.leave(`group_${groupId}`);
  });

  // ========== Typing Indicators ==========
  socket.on("typing", ({ from, to, isTyping }) => {
    socket.to(to).emit("user_typing", { from, isTyping });
  });

  socket.on("group_typing", ({ groupId, user, isTyping, username }) => {
    socket
      .to(`group_${groupId}`)
      .emit("group_typing", { groupId, user, isTyping, username });
  });

  // ========== Read Receipts ==========
  socket.on("mark_read", async ({ userId, otherUserId }) => {
    try {
      const result = await Message.updateMany(
        { from: otherUserId, to: userId, read: false },
        { read: true, readAt: new Date() }
      );
      if (result.modifiedCount > 0) {
        socket
          .to(otherUserId)
          .emit("messages_read", { by: userId, from: otherUserId });
      }
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  });

  // ========== Private Messages ==========
  socket.on("send_message", async (message) => {
    const { from, to, content, timestamp, fileUrl, fileType, replyTo } =
      message;
    if (from && to && (content || fileUrl)) {
      try {
        const newMessage = new Message({
          from,
          to,
          content: content || "",
          timestamp,
          fileUrl: fileUrl || null,
          fileType: fileType || null,
          replyTo: replyTo || null,
          read: false,
        });
        await newMessage.save();

        let populatedMessage = newMessage.toObject();
        if (replyTo) {
          const replyMsg = await Message.findById(replyTo);
          if (replyMsg) {
            populatedMessage.replyToData = replyMsg;
          }
        }

        io.to(to).emit("receive_message", populatedMessage);
        socket.emit("message_sent", populatedMessage);
      } catch (err) {
        console.error("Error saving message:", err);
      }
    }
  });

  // ========== Group Messages ==========
  socket.on("send_group_message", async (data) => {
    const { groupId, from, content, replyTo, fileUrl, fileType } = data;
    if (groupId && from && content) {
      try {
        const group = await Group.findById(groupId);
        if (!group || !group.members.includes(from)) {
          console.error("Invalid group or user not a member");
          return;
        }

        const newMessage = new GroupMessage({
          groupId,
          from,
          content,
          replyTo: replyTo || null,
          fileUrl: fileUrl || null,
          fileType: fileType || null,
        });
        await newMessage.save();

        const populated = await GroupMessage.findById(newMessage._id)
          .populate("from", "username image")
          .populate("replyTo");

        io.to(`group_${groupId}`).emit("group_message", populated);

        // --- Mention detection ---
        const mentionRegex = /@(\w+)/g;
        let match;
        const mentionedUsernames = [];
        while ((match = mentionRegex.exec(content)) !== null) {
          mentionedUsernames.push(match[1]);
        }
        if (mentionedUsernames.length > 0) {
          const members = await User.find({
            _id: { $in: group.members },
            username: { $in: mentionedUsernames },
          });
          for (const member of members) {
            if (member._id.toString() !== from) {
              const targetSocketId = onlineUsers.get(member._id.toString());
              if (targetSocketId) {
                io.to(targetSocketId).emit("mention_notification", {
                  from: from,
                  groupId,
                  groupName: group.name,
                  messagePreview: content.substring(0, 100),
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("Error saving group message:", err);
      }
    }
  });

  // ========== Edit/Delete Private Messages ==========
  socket.on("edit_message", async ({ messageId, newContent, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (message && message.from.toString() === userId) {
        message.content = newContent;
        message.edited = true;
        message.editedAt = new Date();
        await message.save();
        io.to(message.to.toString()).emit("message_edited", {
          messageId,
          newContent,
          editedAt: message.editedAt,
        });
        io.to(message.from.toString()).emit("message_edited", {
          messageId,
          newContent,
          editedAt: message.editedAt,
        });
      }
    } catch (err) {
      console.error("Error editing message:", err);
    }
  });

  socket.on("delete_message", async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (
        message &&
        (message.from.toString() === userId || message.to.toString() === userId)
      ) {
        message.deleted = true;
        await message.save();
        io.to(message.to.toString()).emit("message_deleted", { messageId });
        io.to(message.from.toString()).emit("message_deleted", { messageId });
      }
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  });

  // ========== Edit/Delete Group Messages ==========
  socket.on("edit_group_message", async ({ messageId, newContent, userId }) => {
    try {
      const message = await GroupMessage.findById(messageId);
      if (message && message.from.toString() === userId) {
        message.content = newContent;
        message.edited = true;
        message.editedAt = new Date();
        await message.save();
        io.to(`group_${message.groupId}`).emit("group_message_edited", {
          messageId,
          newContent,
          editedAt: message.editedAt,
        });
      }
    } catch (err) {
      console.error("Error editing group message:", err);
    }
  });

  socket.on("delete_group_message", async ({ messageId, userId }) => {
    try {
      const message = await GroupMessage.findById(messageId);
      if (message && message.from.toString() === userId) {
        message.deleted = true;
        await message.save();
        io.to(`group_${message.groupId}`).emit("group_message_deleted", {
          messageId,
        });
      }
    } catch (err) {
      console.error("Error deleting group message:", err);
    }
  });

  // ========== Reactions ==========
  socket.on("add_reaction", async ({ messageId, userId, emoji }) => {
    try {
      const message = await Message.findById(messageId);
      if (message) {
        const existingIndex = message.reactions.findIndex(
          (r) => r.user.toString() === userId
        );
        if (existingIndex !== -1) message.reactions.splice(existingIndex, 1);
        message.reactions.push({ user: userId, emoji });
        await message.save();
        io.to(message.to.toString()).emit("reaction_updated", {
          messageId,
          reactions: message.reactions,
        });
        io.to(message.from.toString()).emit("reaction_updated", {
          messageId,
          reactions: message.reactions,
        });
      }
    } catch (err) {
      console.error("Error adding reaction:", err);
    }
  });

  socket.on("add_group_reaction", async ({ messageId, userId, emoji }) => {
    try {
      const message = await GroupMessage.findById(messageId);
      if (message) {
        const existingIndex = message.reactions.findIndex(
          (r) => r.user.toString() === userId
        );
        if (existingIndex !== -1) message.reactions.splice(existingIndex, 1);
        message.reactions.push({ user: userId, emoji });
        await message.save();
        io.to(`group_${message.groupId}`).emit("group_reaction_updated", {
          messageId,
          reactions: message.reactions,
        });
      }
    } catch (err) {
      console.error("Error adding group reaction:", err);
    }
  });

  // ========== Disconnect ==========
  socket.on("disconnect", async () => {
    console.log("Client disconnected:", socket.id);
    if (currentUserId) {
      onlineUsers.delete(currentUserId);
      await User.findByIdAndUpdate(currentUserId, {
        online: false,
        lastSeen: new Date(),
      });
      io.emit("user_offline", currentUserId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
