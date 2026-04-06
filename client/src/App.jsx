import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import Lobby from './Lobby'
import Game from './Game'

// Create the socket connection once — persists for the whole session
const socket = io('http://localhost:3001')

function App() {
  const [connected, setConnected] = useState(false)

  // Tracks which screen to show: 'lobby' or 'game'
  const [screen, setScreen] = useState('lobby')

  // Stores the player list passed from lobby when game starts
  const [initialData, setInitialData] = useState(null)

  useEffect(() => {
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    return () => {
      socket.off('connect')
      socket.off('disconnect')
    }
  }, [])

  // Called by Lobby when the host starts the game —
  // switches the whole app to the game screen
  const handleGameStart = (data) => {
    setInitialData(data)
    setScreen('game')
  }

  // Show connecting message while socket is establishing
  if (!connected) {
    return <p style={{ padding: '40px' }}>Connecting to server...</p>
  }

  // Show game screen once started
  if (screen === 'game') {
    return <Game socket={socket} initialData={initialData} />
  }

  // Default: show the lobby
  return <Lobby socket={socket} onGameStart={handleGameStart} />
}

export default App