// Import useState for storing data and useEffect for running code on load
import { useState, useEffect } from 'react'

// This component handles both creating and joining a room.
// It receives the socket connection and a callback function as props —
// when the game starts, it calls onGameStart to tell App.jsx to switch screens.
function Lobby({ socket, onGameStart }) {

  // Stores the name the player types in
  const [playerName, setPlayerName] = useState('')

  // Stores the room ID if joining an existing room
  const [roomId, setRoomId] = useState('')

  // Stores the list of players currently in the lobby
  const [players, setPlayers] = useState([])

  // Tracks which screen to show:
  // 'home' = the initial screen with create/join buttons
  // 'waiting' = the lobby waiting room after creating or joining
  const [screen, setScreen] = useState('home')

  // Stores the current room ID once we're in a room
  const [currentRoomId, setCurrentRoomId] = useState('')

  // Stores whether this player is the host
  const [isHost, setIsHost] = useState(false)

  // Stores any error messages to show the player
  const [error, setError] = useState('')

  // useEffect runs once when the component loads.
  // We set up all our Socket.io listeners here.
  useEffect(() => {

    // Server confirmed our room was created —
    // move to the waiting screen
    socket.on('room-created', ({ roomId }) => {
      setCurrentRoomId(roomId)
      setPlayers([{ name: playerName, isHost: true }])
      setIsHost(true)
      setScreen('waiting')
    })

    // Server sent an updated player list —
    // update our display whenever someone joins or leaves
    socket.on('lobby-update', ({ players }) => {
      setPlayers(players)
    })

    // Server says the game is starting —
    // call the parent callback to switch to the game screen
    socket.on('game-started', ({ players }) => {
      onGameStart({ players, roomId: currentRoomId })
    })

    // Server sent an error — show it to the player
    socket.on('error', (message) => {
      setError(message)
    })

    // Cleanup: remove listeners when component unmounts
    return () => {
      socket.off('room-created')
      socket.off('lobby-update')
      socket.off('game-started')
      socket.off('error')
    }
  }, [playerName, currentRoomId])

  // Called when the player clicks "Create game"
  const handleCreateRoom = () => {
    // Don't proceed if name is empty
    if (!playerName.trim()) {
      setError('Please enter your name')
      return
    }
    setError('')
    // Emit the create-room event to the server with the player's name
    socket.emit('create-room', { playerName })
  }

  // Called when the player clicks "Join game"
  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setError('Please enter your name')
      return
    }
    if (!roomId.trim()) {
      setError('Please enter a room code')
      return
    }
    setError('')
    // Emit join-room with both the room ID and player name
    socket.emit('join-room', { roomId: roomId.toUpperCase(), playerName })
    setCurrentRoomId(roomId.toUpperCase())
    setScreen('waiting')
  }

  // Called when the host clicks "Start game"
  const handleStartGame = () => {
    socket.emit('start-game')
  }

  // --- RENDER ---
  // Show the home screen if we haven't created or joined a room yet
  if (screen === 'home') {
    return (
      <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '400px' }}>
        <h1>Litt</h1>

        {/* Name input — used for both creating and joining */}
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Your name"
            value={playerName}
            // Update playerName state every time the input changes
            onChange={(e) => setPlayerName(e.target.value)}
            style={{ padding: '8px', fontSize: '16px', width: '100%' }}
          />
        </div>

        {/* Room code input — only needed for joining */}
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Room code (to join existing game)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            style={{ padding: '8px', fontSize: '16px', width: '100%' }}
          />
        </div>

        {/* Show any error message in red */}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {/* Two action buttons */}
        <button
          onClick={handleCreateRoom}
          style={{ padding: '10px 20px', marginRight: '12px', fontSize: '16px' }}
        >
          Create game
        </button>
        <button
          onClick={handleJoinRoom}
          style={{ padding: '10px 20px', fontSize: '16px' }}
        >
          Join game
        </button>
      </div>
    )
  }

  // Show the waiting room once we're in a room
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '400px' }}>
      <h1>Litt</h1>
      <h2>Room: {currentRoomId}</h2>

      {/* Shareable link — players can copy and send this to friends */}
      <p style={{ color: '#666' }}>
        Share this code with your friends: <strong>{currentRoomId}</strong>
      </p>

      {/* Live player list — updates in real time as people join */}
      <h3>Players ({players.length}/4)</h3>
      <ul>
        {players.map((player, index) => (
          <li key={index}>
            {/* Show crown emoji next to the host */}
            {player.name} {player.isHost ? '👑' : ''}
          </li>
        ))}
      </ul>

      {/* Only the host sees the Start button, and only when 2+ players present */}
      {isHost && players.length >= 4 && (
        <button
          onClick={handleStartGame}
          style={{ padding: '10px 20px', fontSize: '16px' }}
        >
          Start game
        </button>
      )}

      {/* Non-hosts see a waiting message instead */}
      {!isHost && (
        <p>Waiting for host to start the game...</p>
      )}
    </div>
  )
}

export default Lobby