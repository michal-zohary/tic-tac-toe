// Connect to Socket.io server
const socket = io();

// DOM elements
const statusEl = document.getElementById('status');
const findGameBtn = document.getElementById('find-game-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const cells = document.querySelectorAll('.cell');

// Game state variables
let mySymbol = null;
let currentRoomId = null;
let currentTurn = 'X';
let isGameActive = false;
let boardState = Array(9).fill(null);

const WINNING_COMBINATIONS = [
  [0, 1, 2], // Top row
  [3, 4, 5], // Middle row
  [6, 7, 8], // Bottom row
  [0, 3, 6], // Left col
  [1, 4, 7], // Middle col
  [2, 5, 8], // Right col
  [0, 4, 8], // Diagonal 1
  [2, 4, 6], // Diagonal 2
];

/**
 * Reset local game board and UI elements
 */
function resetBoard() {
  boardState = Array(9).fill(null);
  cells.forEach((cell) => {
    cell.textContent = '';
    cell.className = 'cell';
    delete cell.dataset.symbol;
  });
  mySymbol = null;
  currentRoomId = null;
  currentTurn = 'X';
  isGameActive = false;
}

/**
 * Update the status element based on the current turn
 */
function updateTurnStatus() {
  if (!isGameActive) return;
  if (currentTurn === mySymbol) {
    statusEl.textContent = `Your turn (${mySymbol})`;
  } else {
    statusEl.textContent = `Opponent's turn (${currentTurn})`;
  }
}

/**
 * Highlight winning 3 cells
 */
function highlightWinningCells(board, winner) {
  if (!winner) return;
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    if (board[a] === winner && board[b] === winner && board[c] === winner) {
      cells[a].classList.add('winning-cell');
      cells[b].classList.add('winning-cell');
      cells[c].classList.add('winning-cell');
      break;
    }
  }
}

// Find Game button handler
findGameBtn.addEventListener('click', () => {
  resetBoard();
  findGameBtn.classList.add('hidden');
  findGameBtn.style.display = 'none';
  playAgainBtn.classList.add('hidden');
  playAgainBtn.style.display = 'none';
  statusEl.textContent = 'Searching for opponent...';
  socket.emit('find-game');
});

// Play Again button handler - resets board and queues player for a new match
playAgainBtn.addEventListener('click', () => {
  resetBoard();
  findGameBtn.classList.add('hidden');
  findGameBtn.style.display = 'none';
  playAgainBtn.classList.add('hidden');
  playAgainBtn.style.display = 'none';
  statusEl.textContent = 'Searching for opponent...';
  socket.emit('find-game');
});

// Cell click handler
cells.forEach((cell) => {
  cell.addEventListener('click', () => {
    const index = parseInt(cell.getAttribute('data-index'), 10);

    // Validate: only allow clicks when game is active, it's player's turn, and cell is empty
    if (!isGameActive) return;
    if (currentTurn !== mySymbol) return;
    if (boardState[index] !== null) return;

    socket.emit('make-move', {
      index,
      cellIndex: index,
      roomId: currentRoomId,
    });
  });
});

// On 'waiting' event
socket.on('waiting', () => {
  statusEl.textContent = 'Waiting for another player...';
});

// On 'game-start' event
socket.on('game-start', (data) => {
  mySymbol = data.symbol;
  currentRoomId = data.roomId;
  currentTurn = 'X';
  isGameActive = true;

  // Hide both buttons during the game
  findGameBtn.classList.add('hidden');
  findGameBtn.style.display = 'none';
  playAgainBtn.classList.add('hidden');
  playAgainBtn.style.display = 'none';

  updateTurnStatus();
});

// On 'move-made' event
socket.on('move-made', (data) => {
  const index = data.index !== undefined ? data.index : data.cellIndex;
  const symbol = data.symbol;

  if (index >= 0 && index < 9) {
    boardState[index] = symbol;
    const targetCell = cells[index];
    targetCell.textContent = symbol;
    targetCell.classList.add(symbol.toLowerCase());
    targetCell.dataset.symbol = symbol;
  }

  if (data.board) {
    boardState = data.board;
  }

  if (data.turn) {
    currentTurn = data.turn;
  } else {
    currentTurn = currentTurn === 'X' ? 'O' : 'X';
  }

  updateTurnStatus();
});

// On 'game-over' event - show ONLY Play Again button
socket.on('game-over', (data) => {
  isGameActive = false;

  if (data.isDraw) {
    statusEl.textContent = "Game Over: It's a draw!";
  } else if (data.winner === mySymbol) {
    statusEl.textContent = 'Game Over: You won!';
  } else if (data.winner) {
    statusEl.textContent = 'Game Over: You lost!';
  }

  if (data.winner) {
    highlightWinningCells(data.board || boardState, data.winner);
  }

  // Show only Play Again button
  findGameBtn.classList.add('hidden');
  findGameBtn.style.display = 'none';
  playAgainBtn.classList.remove('hidden');
  playAgainBtn.style.display = 'inline-block';
});

// On 'opponent-left' event - show ONLY Play Again button
socket.on('opponent-left', () => {
  isGameActive = false;
  statusEl.textContent = 'Opponent disconnected';

  // Show only Play Again button
  findGameBtn.classList.add('hidden');
  findGameBtn.style.display = 'none';
  playAgainBtn.classList.remove('hidden');
  playAgainBtn.style.display = 'inline-block';
});
