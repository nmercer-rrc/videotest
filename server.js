const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

const waiting = [];

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("ready", () => {
    if (waiting.length > 0) {
      const peer = waiting.shift();
      const roomId = uuidv4();
      socket.join(roomId);
      peer.join(roomId);

      socket.roomId = roomId;
      peer.roomId = roomId;

      console.log(`Paired sockets ${socket.id} and ${peer.id} in room ${roomId}`);

      // Notify only one to initiate
      socket.emit("initiate");
    } else {
      waiting.push(socket);
      console.log(`Socket ${socket.id} is waiting for a partner`);
    }
  });

  socket.on("signal", (data) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit("signal", data);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (socket.roomId) {
      socket.to(socket.roomId).emit("partner-disconnected");
    }
    const index = waiting.indexOf(socket);
    if (index !== -1) {
      waiting.splice(index, 1);
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
