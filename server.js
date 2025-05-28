const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

const waitingQueue = [];

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("ready", () => {
    if (waitingQueue.length > 0) {
      const partner = waitingQueue.shift();
      const roomId = uuidv4();
      socket.join(roomId);
      partner.join(roomId);

      socket.roomId = roomId;
      partner.roomId = roomId;

      console.log(`Paired sockets ${socket.id} and ${partner.id} in room ${roomId}`);

      socket.emit("partner-ready");
      partner.emit("partner-ready");
    } else {
      waitingQueue.push(socket);
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
    const index = waitingQueue.indexOf(socket);
    if (index !== -1) {
      waitingQueue.splice(index, 1);
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
