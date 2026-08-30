const crypto = require('crypto');
const TicTacToeGame = require('./game');

// Waiting queue for matchmaking (array of sockets)
const waitingQueue = [];

// Active games Map: roomId -> { game, players }
const games = new Map();

// Map of socketId -> roomId
const socketToRoom = new Map();

/**
 * Generate a unique room identifier.
 */
function generateRoomId() {
  if (typeof crypto.randomUUID === 'function') {
    return `room_${crypto.randomUUID()}`;
  }
  return `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Remove a socket from the waiting queue.
 * @param {object} socket - The socket instance to remove.
 * @returns {boolean} True if removed, false otherwise.
 */
function removeFromQueue(socket) {
  if (!socket) return false;
  const index = waitingQueue.findIndex((s) => s.id === socket.id);
  if (index !== -1) {
    waitingQueue.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Clean up a game room and all associated player mappings.
 * @param {string} roomId - The room identifier to clean up.
 */
function cleanUpRoom(roomId) {
  if (!roomId) return;
  const gameData = games.get(roomId);
  if (gameData && gameData.players) {
    Object.keys(gameData.players).forEach((playerId) => {
      socketToRoom.delete(playerId);
      const playerObj = gameData.players[playerId];
      if (playerObj && playerObj.socket && typeof playerObj.socket.leave === 'function') {
        playerObj.socket.leave(roomId);
      }
    });
  }
  games.delete(roomId);
}

/**
 * Add a socket to the matchmaking queue or pair with a waiting player.
 * @param {object} socket - The player's socket.
 * @param {object} io - The Socket.io server instance.
 */
function addToQueue(socket, io) {
  if (!socket || socket.connected === false) return;

  // Prevent duplicate entries in the waiting queue
  if (waitingQueue.some((s) => s.id === socket.id)) {
    return;
  }

  // If the socket was associated with an earlier room, clean up old association
  if (socketToRoom.has(socket.id)) {
    const oldRoomId = socketToRoom.get(socket.id);
    const oldGameData = games.get(oldRoomId);

    if (typeof socket.leave === 'function') {
      socket.leave(oldRoomId);
    }
    socketToRoom.delete(socket.id);

    // If the old game was still in progress (not completed), notify opponent
    if (
      oldGameData &&
      oldGameData.game &&
      oldGameData.game.winner === null &&
      !oldGameData.game.isDraw
    ) {
      if (socket.to) {
        socket.to(oldRoomId).emit('opponent-left');
      } else if (io && io.to) {
        io.to(oldRoomId).emit('opponent-left');
      }
    }

    if (oldGameData && oldGameData.players) {
      delete oldGameData.players[socket.id];
      if (Object.keys(oldGameData.players).length === 0) {
        games.delete(oldRoomId);
      }
    }
  }

  // Filter out any stale/disconnected sockets from the queue
  while (waitingQueue.length > 0 && waitingQueue[0].connected === false) {
    waitingQueue.shift();
  }

  // If another player is waiting in queue, match them
  if (waitingQueue.length > 0) {
    const opponentSocket = waitingQueue.shift();

    if (opponentSocket.connected === false || opponentSocket.id === socket.id) {
      return addToQueue(socket, io);
    }

    const roomId = generateRoomId();
    const game = new TicTacToeGame();

    // Assign X and O randomly
    const isFirstPlayerX = Math.random() < 0.5;
    const socketSymbol = isFirstPlayerX ? 'X' : 'O';
    const opponentSymbol = isFirstPlayerX ? 'O' : 'X';

    // Both sockets join the new room
    if (typeof socket.join === 'function') socket.join(roomId);
    if (typeof opponentSocket.join === 'function') opponentSocket.join(roomId);

    // Track active game and socket mappings
    games.set(roomId, {
      game,
      players: {
        [socket.id]: { socket, symbol: socketSymbol },
        [opponentSocket.id]: { socket: opponentSocket, symbol: opponentSymbol },
      },
    });

    socketToRoom.set(socket.id, roomId);
    socketToRoom.set(opponentSocket.id, roomId);

    // Emit 'game-start' to both with their symbol and room ID
    socket.emit('game-start', { symbol: socketSymbol, roomId });
    opponentSocket.emit('game-start', { symbol: opponentSymbol, roomId });
  } else {
    waitingQueue.push(socket);
    socket.emit('waiting');
  }
}

/**
 * Handle socket disconnection: remove from queue or notify opponent and clean up active game.
 * @param {object} socket - The disconnecting socket.
 * @param {object} io - The Socket.io server instance.
 */
function handleDisconnect(socket, io) {
  if (!socket) return;

  // If socket is in waiting queue, remove them
  removeFromQueue(socket);

  // If socket is in an active game
  const roomId = socketToRoom.get(socket.id);
  if (roomId) {
    const gameData = games.get(roomId);
    if (gameData) {
      // Notify opponent ONLY if the game was still active/ongoing
      if (
        gameData.game &&
        gameData.game.winner === null &&
        !gameData.game.isDraw
      ) {
        if (socket.to) {
          socket.to(roomId).emit('opponent-left');
        } else if (io && io.to) {
          io.to(roomId).emit('opponent-left');
        }
      }

      // Clean up socketToRoom map for all players in this game
      if (gameData.players) {
        Object.keys(gameData.players).forEach((playerId) => {
          socketToRoom.delete(playerId);
        });
      }

      // Remove game instance
      games.delete(roomId);
    }
    socketToRoom.delete(socket.id);
  }
}

module.exports = {
  waitingQueue,
  games,
  activeGames: games,
  socketToRoom,
  playerRooms: socketToRoom,
  cleanUpRoom,
  addToQueue,
  removeFromQueue,
  handleDisconnect,
};
