const WINNING_COMBINATIONS = [
  [0, 1, 2], // Top row
  [3, 4, 5], // Middle row
  [6, 7, 8], // Bottom row
  [0, 3, 6], // Left column
  [1, 4, 7], // Middle column
  [2, 5, 8], // Right column
  [0, 4, 8], // Diagonal top-left to bottom-right
  [2, 4, 6], // Diagonal top-right to bottom-left
];

class TicTacToeGame {
  constructor() {
    this.board = Array(9).fill(null);
    this.turn = 'X';
    this.winner = null;
    this.isDraw = false;
  }

  makeMove(cellIndex, player) {
    // If game is already finished, move is invalid
    if (this.winner !== null || this.isDraw) {
      return {
        valid: false,
        symbol: null,
        winner: this.winner,
        isDraw: this.isDraw,
        board: [...this.board],
      };
    }

    // Validate cellIndex: must be an integer between 0 and 8
    if (
      typeof cellIndex !== 'number' ||
      !Number.isInteger(cellIndex) ||
      cellIndex < 0 ||
      cellIndex > 8
    ) {
      return {
        valid: false,
        symbol: null,
        winner: this.winner,
        isDraw: this.isDraw,
        board: [...this.board],
      };
    }

    // Validate cell must be empty
    if (this.board[cellIndex] !== null) {
      return {
        valid: false,
        symbol: null,
        winner: this.winner,
        isDraw: this.isDraw,
        board: [...this.board],
      };
    }

    // Validate correct player's turn (if player is specified)
    if (player !== undefined && player !== this.turn) {
      return {
        valid: false,
        symbol: null,
        winner: this.winner,
        isDraw: this.isDraw,
        board: [...this.board],
      };
    }

    const symbol = this.turn;
    this.board[cellIndex] = symbol;

    // Check all 8 winning lines
    const hasWon = WINNING_COMBINATIONS.some(([a, b, c]) => {
      return (
        this.board[a] !== null &&
        this.board[a] === this.board[b] &&
        this.board[a] === this.board[c]
      );
    });

    if (hasWon) {
      this.winner = symbol;
      return {
        valid: true,
        symbol,
        winner: this.winner,
        isDraw: false,
        board: [...this.board],
      };
    }

    // Check for draw (all cells filled without a winner)
    const isDraw = this.board.every((cell) => cell !== null);
    if (isDraw) {
      this.isDraw = true;
      return {
        valid: true,
        symbol,
        winner: null,
        isDraw: true,
        board: [...this.board],
      };
    }

    // Advance turn to the next player
    this.turn = this.turn === 'X' ? 'O' : 'X';

    return {
      valid: true,
      symbol,
      winner: null,
      isDraw: false,
      board: [...this.board],
    };
  }

  getState() {
    return {
      board: [...this.board],
      turn: this.turn,
      winner: this.winner,
      isDraw: this.isDraw,
    };
  }
}

TicTacToeGame.WINNING_COMBINATIONS = WINNING_COMBINATIONS;
TicTacToeGame.TicTacToeGame = TicTacToeGame;

module.exports = TicTacToeGame;
