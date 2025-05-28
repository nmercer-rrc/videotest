const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Fallback route to serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Handle socket connections
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    const numClients = room ? room.size : 0;

    console.log(`Room ${roomId} has ${numClients} client(s) before join`);

    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);

    const shouldOffer = numClients === 1;
    socket.emit("initiate", shouldOffer);
  });

  socket.on("signal", ({ roomId, data }) => {
    console.log(`Relaying signal in room ${roomId}`);
    socket.to(roomId).emit("signal", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
