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
 * Add a socket to the matchmaking queue or pair with a waiting player.
 * @param {object} socket - The player's socket.
 * @param {object} io - The Socket.io server instance.
 */
function addToQueue(socket, io) {
  if (!socket) return;

  // Prevent duplicate entries in the waiting queue
  if (waitingQueue.some((s) => s.id === socket.id)) {
    return;
  }

  // If the socket was in a previous room, clean up that association
  if (socketToRoom.has(socket.id)) {
    const oldRoomId = socketToRoom.get(socket.id);
    const oldGameData = games.get(oldRoomId);

    // Leave the old Socket.io room
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

    // Clean up player entry from old game data
    if (oldGameData && oldGameData.players) {
      delete oldGameData.players[socket.id];
      // If no players remain in the old room, delete it
      if (Object.keys(oldGameData.players).length === 0) {
        games.delete(oldRoomId);
      }
    }
  }

  // If another player is already waiting in queue, match them
  if (waitingQueue.length > 0) {
    const opponentSocket = waitingQueue.shift();

    // If the waiting opponent disconnected in the meantime, try next
    if (opponentSocket.connected === false) {
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
      // Notify opponent
      if (socket.to) {
        socket.to(roomId).emit('opponent-left');
      } else if (io && io.to) {
        io.to(roomId).emit('opponent-left');
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
  addToQueue,
  removeFromQueue,
  handleDisconnect,
};
