const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const {
  addToQueue,
  handleDisconnect,
  cleanUpRoom,
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
    try {
      addToQueue(socket, io);
    } catch (err) {
      console.error(`Error in find-game for socket ${socket.id}:`, err);
    }
  });

  // Listen for player moves
  socket.on('make-move', (data) => {
    try {
      const roomId = playerRooms.get(socket.id);
      if (!roomId) return;

      const gameData = activeGames.get(roomId);
      if (!gameData || !gameData.game || !gameData.players) return;

      // Ensure the socket belongs to this game
      const playerObj = gameData.players[socket.id];
      if (!playerObj) return;

      // Extract and validate cellIndex (must be integer 0..8)
      let cellIndex;
      if (typeof data === 'number') {
        cellIndex = data;
      } else if (typeof data === 'object' && data !== null) {
        // If data.roomId is provided, ensure it matches actual player's room
        if (data.roomId && data.roomId !== roomId) return;
        cellIndex = data.index !== undefined ? data.index : data.cellIndex;
      }

      if (
        typeof cellIndex !== 'number' ||
        !Number.isInteger(cellIndex) ||
        cellIndex < 0 ||
        cellIndex > 8
      ) {
        return;
      }

      const playerSymbol =
        typeof playerObj === 'object' ? playerObj.symbol : playerObj;
      if (!playerSymbol) return;

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
    } catch (err) {
      console.error(`Error in make-move for socket ${socket.id}:`, err);
    }
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    try {
      handleDisconnect(socket, io);
    } catch (err) {
      console.error(`Error in disconnect for socket ${socket.id}:`, err);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
