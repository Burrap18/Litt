// Import required libraries
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')

// Import all the game logic functions we built in game.js
const {
  initializeGame,
  buildViewFor,
  processAsk,
  processDeclare
} = require('./game')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://litt-client.onrender.com'],
    methods: ['GET', 'POST']
  }
})

// Stores all active game rooms in memory.
// Each key is a roomId, each value is the room's full data
// including players and game state.
const rooms = {}

// Generates a random 6-character room ID like 'ABC123'
function generateRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

// Broadcasts the current game state to every player in a room.
// Each player gets their own filtered view — they only see their own hand.
function broadcastGameState(roomId) {
  const room = rooms[roomId]
  if (!room || !room.gameState) return

  // Loop through every player and send them their personal view
  room.players.forEach(player => {
    io.to(player.id).emit('game-update',
      buildViewFor(player.id, room.gameState)
    )
  })
}

io.on('connection', (socket) => {
  console.log('A player connected:', socket.id)

  // --- CREATE ROOM ---
  socket.on('create-room', ({ playerName }) => {
    const roomId = generateRoomId()

    rooms[roomId] = {
      players: [{ id: socket.id, name: playerName, isHost: true }],
      status: 'waiting',
      gameState: null  // game state is null until host starts the game
    }

    socket.join(roomId)
    socket.roomId = roomId
    socket.playerName = playerName

    socket.emit('room-created', { roomId })
    console.log(`Room ${roomId} created by ${playerName}`)
  })

// --- JOIN ROOM ---
  socket.on('join-room', ({ roomId, playerName }) => {
    const room = rooms[roomId]

    if (!room) {
      socket.emit('error', 'Room not found')
      return
    }

    if (room.status === 'in-progress') {
      console.log(`Room ${roomId} is in progress. Looking for player: "${playerName}"`)
      console.log(`Players in room: ${room.players.map(p => p.name).join(', ')}`)
      // Check if this player was already in the game
      const existingPlayer = room.players.find(p => p.name === playerName)
      console.log(`Existing player found: ${existingPlayer ? 'YES' : 'NO'}`)

      if (existingPlayer) {
        console.log(`Rejoin attempt by ${playerName} — found existing player`)
        // Save old ID before overwriting it
        const oldSocketId = existingPlayer.id

        // Rejoin — update their socket ID and put them back in
        existingPlayer.id = socket.id
        socket.join(roomId)
        socket.roomId = roomId
        socket.playerName = playerName

        // Update the game state with their new socket ID
        if (room.gameState && room.gameState.players[oldSocketId]) {
          const playerData = room.gameState.players[oldSocketId]
          delete room.gameState.players[oldSocketId]
          room.gameState.players[socket.id] = { ...playerData, id: socket.id }

          // Update teams
          for (const team of Object.keys(room.gameState.teams)) {
            room.gameState.teams[team] = room.gameState.teams[team].map(
              id => id === oldSocketId ? socket.id : id
            )
          }

          // Update currentTurn if it was this player's turn
          if (room.gameState.currentTurn === oldSocketId) {
            room.gameState.currentTurn = socket.id
          }
        }

        // Send them straight back into the game
          console.log(`${playerName} rejoined successfully, sending game-started with isRejoin: true`)
        socket.emit('game-started', { players: room.players, isRejoin: true })
        socket.emit('game-update', buildViewFor(socket.id, room.gameState))
        console.log(`${playerName} rejoined room ${roomId}`)
        return
      } 
      else {
        socket.emit('error', 'Game already started')
        return
      }
    }

    if (room.players.length >= 4) {
      socket.emit('error', 'Room is full')
      return
    }

    room.players.push({ id: socket.id, name: playerName, isHost: false })
    socket.join(roomId)
    socket.roomId = roomId
    socket.playerName = playerName

    io.to(roomId).emit('lobby-update', { players: room.players })
    console.log(`${playerName} joined room ${roomId}`)
  })

  // --- REQUEST GAME STATE ---
  // Called by client when it mounts the Game component
  // to ensure it always has the latest state
  socket.on('request-game-state', () => {
    const room = rooms[socket.roomId]
    if (!room || !room.gameState) return
    socket.emit('game-update', buildViewFor(socket.id, room.gameState))
  })

  // --- START GAME ---
  socket.on('start-game', () => {
    const room = rooms[socket.roomId]
    if (!room) return

    const player = room.players.find(p => p.id === socket.id)
    if (!player.isHost) {
      socket.emit('error', 'Only the host can start the game')
      return
    }
    if (room.players.length < 4) {
      socket.emit('error', 'Need 4 players to start')
      return
    }

    // Initialize the full game state using our game engine
    room.gameState = initializeGame(room.players)
    room.status = 'in-progress'

// First tell the lobby screen to switch to the game screen
    io.to(socket.roomId).emit('game-started', {
      players: room.players
    })

    // Then send each player their starting view —
    // small delay ensures the client has switched to Game screen
    // and has its listeners ready before the state arrives
    setTimeout(() => {
      broadcastGameState(socket.roomId)
    }, 100)

    console.log(`Game started in room ${socket.roomId}`)
  })

  // --- ASK CARD ---
  // Fired when the current player asks an opponent for a card
  socket.on('ask-card', ({ targetId, cardId }) => {
    const room = rooms[socket.roomId]
    if (!room || !room.gameState) return

    // Run the ask through our game logic
    const result = processAsk(room.gameState, socket.id, targetId, cardId)

    if (!result.success) {
      // Invalid move — send error only to the player who tried it
      socket.emit('error', result.error)
      return
    }

    // Broadcast the ask result to everyone in the room
    // so all screens can show what happened
    io.to(socket.roomId).emit('ask-result', result)

    // Send each player their updated personal view
    broadcastGameState(socket.roomId)

    console.log(result.message)
  })

  // --- DECLARE CASE ---
  // Fired when the current player declares a case
  socket.on('declare-case', ({ caseKey }) => {
    const room = rooms[socket.roomId]
    if (!room || !room.gameState) return

    // Run the declaration through our game logic
    const result = processDeclare(room.gameState, socket.id, caseKey)

    if (!result.success) {
      // Invalid move — send error only to the player who tried it
      socket.emit('error', result.error)
      return
    }

    // Broadcast the declaration result to everyone in the room
    io.to(socket.roomId).emit('declaration-result', result)

    // If the game is over, broadcast the final state
    if (result.gameOver) {
      io.to(socket.roomId).emit('game-over', {
        winner: result.winner,
        reason: result.reason,
        message: result.message
      })
    }

    // Send each player their updated personal view
    broadcastGameState(socket.roomId)

    console.log(result.message)
  })

  // --- DISCONNECT ---
  socket.on('disconnect', () => {
    console.log('A player disconnected:', socket.id)

    const room = rooms[socket.roomId]

    if (room) {
      if (room.status === 'in-progress') {
        // Game in progress — don't remove the player, just mark them
        // as disconnected so they can rejoin with the same name
        const player = room.players.find(p => p.id === socket.id)
        if (player) {
          player.disconnected = true
          console.log(`${player.name} disconnected from active game — kept in room for rejoin`)
        }
      } else {
        // Still in lobby — remove them and update the lobby
        room.players = room.players.filter(p => p.id !== socket.id)

        // If the room is now empty, delete it entirely
        if (room.players.length === 0) {
          delete rooms[socket.roomId]
          console.log(`Room ${socket.roomId} deleted — no players left`)
        } else {
          // Tell remaining players someone left
          io.to(socket.roomId).emit('lobby-update', { players: room.players })
        }
      }
    }
  })
})

const PORT = 3001
server.listen(PORT, () => {
  console.log(`Litt server running on port ${PORT}`)
})