const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");
const path = require("path");
const Message = require("./models/Message");
const authRoutes = require("./routes/auth");
const app = express();
require("dotenv").config();

const PORT = process.env.PORT;
const host = process.env.HOST;
const mongoDB = process.env.MONGODB;
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: host,
    methods: ["GET", "POST", "DELETE"],
  },
});

mongoose
  .connect(mongoDB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then()
  .catch((err) => console.log(err));
app.use(express.static(path.join(__dirnamr, "dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
app.use("/api/auth", authRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.set("io", io);

io.on("connection", (socket) => {

  socket.on("join_room", (userId) => {
    socket.join(userId);
  });

  socket.on("send_message", async (message) => {
    const { from, to, content, timestamp } = message;

    if (from && to && content) {
      const newMessage = new Message({ from, to, content, timestamp });
      await newMessage.save();

      io.to(to).emit("receive_message", message);
    } else {
      console.error("Message is missing from,to,content");
    }
  });

  socket.on("disconnect", () => {
    console.log("disconnected");
  });
});

server.listen(PORT);
