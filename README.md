# Real-Time Multiplayer Tic-Tac-Toe

A real-time, two-player online Tic-Tac-Toe game featuring instant matchmaking, WebSocket synchronization, and a modern pastel aesthetic.

## How to Play

1. **Find Game**: Click **Find Game** to enter the matchmaking queue.
2. **Matchmaking**: As soon as another player queues, a unique game room is created and symbols (`X` and `O`) are randomly assigned.
3. **Take Turns**: `X` always goes first. Click an empty cell on your turn to place your mark.
4. **Win / Draw**: Align 3 symbols horizontally, vertically, or diagonally to win. If all 9 cells fill up without a winner, the game ends in a draw.
5. **Play Again**: Click **Play Again** at the end of a match to immediately search for your next opponent.

## Tech Stack

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: Vanilla HTML5, CSS3 (CSS Grid, Keyframe Animations, Mobile Responsive), Vanilla JavaScript

## Run Locally

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd tic-tac-toe
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   node server.js
   ```

4. **Play**:
   Open [http://localhost:3000](http://localhost:3000) in your browser (open two tabs to test multiplayer locally).

## How It Works

- **Matchmaking & Rooms**: The server maintains a waiting queue (`matchmaking.js`). When two players are available, they are paired into an isolated Socket.io room with a dedicated `TicTacToeGame` instance.
- **Server Authority**: Move requests (`make-move`) are sent over WebSockets and validated server-side (turn verification, boundary checks, board state integrity) before updating the game.
- **Real-Time Communication**: Events such as `game-start`, `move-made`, `game-over`, and `opponent-left` are broadcast instantaneously to both players in the room.
