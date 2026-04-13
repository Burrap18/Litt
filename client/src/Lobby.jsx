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
  const [showRules, setShowRules] = useState(false)

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
      // Only switch to waiting screen on a normal join
      if (screen === 'home') setScreen('waiting')
    })

    // Server says the game is starting —
    // call the parent callback to switch to the game screen
    socket.on('game-started', ({ players, isRejoin }) => {
      // On rejoin, currentRoomId may not be set yet — use the roomId from join
      onGameStart({ players, roomId: currentRoomId || roomId.toUpperCase() })
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
    if (!playerName.trim()) {
      setError('Please enter your name')
      return
    }
    setError('')
    // Save player name for reconnection
    sessionStorage.setItem('litt-playerName', playerName)
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
    // Store the room ID before emitting so it's available when
    // game-started fires immediately on a rejoin
    const upperRoomId = roomId.toUpperCase()
    setCurrentRoomId(upperRoomId)
    // Save player name for reconnection
    sessionStorage.setItem('litt-playerName', playerName)
    socket.emit('join-room', { roomId: upperRoomId, playerName })
    // Don't set screen to waiting here — let the server response decide
    // If it's a normal join, lobby-update will come and we stay here
    // If it's a rejoin, game-started will come and we go straight to game
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

        {/* Rules dropdown */}
        <div style={{ marginTop: '24px' }}>
          <button
            onClick={() => setShowRules(!showRules)}
            style={{
              background: 'none',
              border: 'none',
              color: '#378add',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '0',
              textDecoration: 'underline'
            }}
          >
            {showRules ? 'Hide rules ▲' : 'Rules of Litt ▼'}
          </button>

          {showRules && (
            <div style={{
              marginTop: '12px',
              background: '#f5f5f5',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '14px',
              lineHeight: '1.8',
              color: '#333',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Litt is played by 4 players divided into 2 teams of 2.</li>
                <li>The game uses a standard deck with all 2s removed — 48 cards total. Each suit runs from 3 to Ace.</li>
                <li>Each suit is divided into two cases: lower (3–8) and upper (9–A). There are 8 cases in total.</li>
                <li>The objective is to win a majority of the 8 cases. The first team to win 5 cases wins. If one team wins 4 and the other wins 3 with 1 undeclared, the team with 4 wins.</li>
                <li>The 48 cards are shuffled and dealt equally — 12 cards per player.</li>
                <li>Teammates sit across from each other. P1 &amp; P3 form one team, P2 &amp; P4 the other.</li>
                <li>The 4 twos are shuffled and dealt face up. The player who receives the 2 of hearts starts the game. The twos are then set aside.</li>
                <li>Teammates never interact with each other directly — all interactions are with the opposition.</li>
                <li>On your turn you may do one of two things: ask an opponent for a card, or declare a case.</li>
                <li>To ask for a card, pick one opponent and name a specific card. If they have it, they must give it to you and you keep your turn. If they don't have it, no card is exchanged and it becomes their turn.</li>
                <li>Base card rule: to ask for a card, you must already hold at least one other card from the same case. For example, to ask for the Ace of spades, you must hold at least one of 9♠ 10♠ J♠ Q♠ K♠.</li>
                <li>To declare a case, put down your cards from that case. If your teammate holds the remaining cards and no opponent holds any, your team wins the case. If any opponent holds even one card from that case, the opposing team wins it.</li>
                <li>After a successful declaration, if the declarer had all 6 cards they keep the turn. If the teammate completed it, the teammate gets the turn. If one player on the declaring team runs out of cards, the other gets the turn.</li>
                <li>After a failed declaration, the opponent who held the most cards from that case gets the turn. Tiebreaker: whoever held the highest card. If that player just ran out of cards, their teammate gets the turn instead.</li>
                <li>If a player runs out of cards at any point, they are out for the rest of the game. The opposing team directs all asks to the remaining player on that team.</li>
                <li>The game also ends if a team runs out of cards after a successful declaration. The team with the higher score at that moment wins. If tied, it's a draw.</li>
              </ol>
            </div>
          )}
        </div>
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