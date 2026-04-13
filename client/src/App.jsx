// App.jsx — top level component that controls which screen to show
// and manages the socket connection for the entire app

import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import Lobby from './Lobby'
import Game from './game'

// Create the socket connection once at the top level —
// this persists for the entire session.
// Reconnection options help mobile devices recover after screen lock —
// Socket.io will automatically retry up to 10 times if connection drops
const socket = io('https://litt-server.onrender.com', {
  reconnection: true,           // automatically try to reconnect
  reconnectionAttempts: 10,     // try up to 10 times
  reconnectionDelay: 1000,      // wait 1 second before first retry
  reconnectionDelayMax: 5000,   // wait at most 5 seconds between retries
})

function App() {
  // Tracks whether the socket is connected to the server
  const [connected, setConnected] = useState(false)

  // Tracks which screen to show across the whole app:
  // 'lobby' = the create/join screen
  // 'game' = the actual game table
  const [screen, setScreen] = useState('lobby')

  // Stores the game data once the host starts the game
  const [initialData, setInitialData] = useState(null)

  useEffect(() => {
    // Fires every time the socket connects or reconnects —
    // including after a mobile screen lock wakes up
    socket.on('connect', () => {
      setConnected(true)

      // Check if we were in a game before losing connection.
      // sessionStorage persists across screen locks but not tab closes.
      const savedName = sessionStorage.getItem('litt-playerName')
      const savedRoom = sessionStorage.getItem('litt-roomId')
      const savedScreen = sessionStorage.getItem('litt-screen')

      // If we were in a game when we lost connection,
      // automatically rejoin without the player having to do anything
      if (savedScreen === 'game' && savedName && savedRoom) {
        socket.emit('join-room', {
          roomId: savedRoom,
          playerName: savedName
        })
      }
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    // Listen for game-started — fires both when a new game begins
    // and when a player successfully rejoins after reconnecting.
    // We check sessionStorage to tell the difference.
    socket.on('game-started', (data) => {
      if (sessionStorage.getItem('litt-screen') === 'game') {
        // This is a reconnect — restore the game screen silently
        const savedRoom = sessionStorage.getItem('litt-roomId')
        setInitialData({ players: data.players, roomId: savedRoom })
        setScreen('game')
      }
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('game-started')
    }
  }, [])

  // Called by Lobby component when the host starts the game —
  // saves session info to sessionStorage for reconnection,
  // then switches the whole app to the game screen
  const handleGameStart = (data) => {
    // Save session info so we can auto-rejoin if connection drops
    sessionStorage.setItem('litt-roomId', data.roomId)
    sessionStorage.setItem('litt-screen', 'game')
    setInitialData(data)
    setScreen('game')
  }

  // Show connecting message while socket is establishing.
  // The extra note helps mobile users who may wait longer
  // if the server is waking up from sleep.
  if (!connected) {
    return (
      <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
        <p>Connecting to server...</p>
        <p style={{ fontSize: '13px', color: '#888', marginTop: '8px' }}>
          If this takes more than 30 seconds, the server may be waking up.
        </p>
      </div>
    )
  }

  // Show game screen once started
  if (screen === 'game') {
    return <Game socket={socket} initialData={initialData} roomId={initialData?.roomId} />
  }

  // Default: show the lobby
  return <Lobby socket={socket} onGameStart={handleGameStart} />
}

export default App