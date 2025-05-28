const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { v4: uuidv4 } = require("uuid"); // Used for generating unique room IDs

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } }); // Allow CORS for all origins (suitable for dev)

app.use(express.static(path.join(__dirname, "public"))); // Serve static files from /public

// Serve the main HTML page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Queue of users waiting for a partner
const waiting = [];

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // When a client is ready for a call
  socket.on("ready", () => {
    if (waiting.length > 0) {
      // Pair the current socket with one that's already waiting
      const peer = waiting.shift();
      const roomId = uuidv4(); // Create a unique room ID

      // Join both sockets to the same room
      socket.join(roomId);
      peer.join(roomId);

      // Store roomId on the sockets for later use
      socket.roomId = roomId;
      peer.roomId = roomId;

      console.log(`Paired sockets ${socket.id} and ${peer.id} in room ${roomId}`);

      // Notify one socket to initiate the WebRTC offer
      socket.emit("initiate");
    } else {
      // No partner available yet, so add to waiting queue
      waiting.push(socket);
      console.log(`Socket ${socket.id} is waiting for a partner`);
    }
  });

  // Relay WebRTC signaling messages (offer/answer/ICE) to the other socket in the room
  socket.on("signal", (data) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit("signal", data);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Notify the other peer in the room, if any
    if (socket.roomId) {
      socket.to(socket.roomId).emit("partner-disconnected");
    }

    // Remove from waiting queue if still waiting
    const index = waiting.indexOf(socket);
    if (index !== -1) {
      waiting.splice(index, 1);
    }
  });
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
