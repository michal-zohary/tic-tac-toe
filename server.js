const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const {
  addToQueue,
  handleDisconnect,
  playerRooms,
  activeGames,
} = require('./matchmaking');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Listen for matchmaking request
  socket.on('find-game', () => {
    addToQueue(socket, io);
  });

  // Listen for player moves
  socket.on('make-move', (data) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const gameData = activeGames.get(roomId);
    if (!gameData || !gameData.game) return;

    const cellIndex =
      typeof data === 'object' && data !== null
        ? data.index !== undefined
          ? data.index
          : data.cellIndex
        : data;

    const playerSymbol =
      typeof gameData.players[socket.id] === 'object'
        ? gameData.players[socket.id].symbol
        : gameData.players[socket.id];

    const result = gameData.game.makeMove(cellIndex, playerSymbol);

    if (result.valid) {
      io.to(roomId).emit('move-made', {
        index: cellIndex,
        cellIndex: cellIndex,
        symbol: result.symbol,
        board: result.board,
        turn: gameData.game.turn,
      });

      if (result.winner !== null || result.isDraw) {
        io.to(roomId).emit('game-over', {
          winner: result.winner,
          isDraw: result.isDraw,
          board: result.board,
        });
      }
    }
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    handleDisconnect(socket, io);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
