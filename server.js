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

let waitingSocket = null;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  if (waitingSocket === null) {
    // No one waiting, add current socket to waiting queue
    waitingSocket = socket;
    socket.emit("waiting");
    console.log(`Socket ${socket.id} is waiting for a partner`);
  } else {
    // Pair found, create a room for both
    const roomId = uuidv4();
    socket.join(roomId);
    waitingSocket.join(roomId);

    console.log(`Paired sockets ${socket.id} and ${waitingSocket.id} in room ${roomId}`);

    // Notify both sockets which one should start offer
    // Assign offerer role arbitrarily (e.g., waitingSocket starts)
    waitingSocket.emit("initiate", true, roomId);
    socket.emit("initiate", false, roomId);

    // Clear waiting queue
    waitingSocket = null;
  }

  socket.on("signal", ({ roomId, data }) => {
    socket.to(roomId).emit("signal", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // If the disconnected socket was waiting, clear queue
    if (waitingSocket && waitingSocket.id === socket.id) {
      waitingSocket = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
