import { useState, useEffect } from 'react'
import Hand from './Hand'
import DeclareModal from './DeclareModal'

// Maps case keys to short display names
const CASE_NAMES = {
  'hearts-lower':   '♥ 3–8', 'hearts-upper':   '♥ 9–A',
  'diamonds-lower': '♦ 3–8', 'diamonds-upper': '♦ 9–A',
  'clubs-lower':    '♣ 3–8', 'clubs-upper':    '♣ 9–A',
  'spades-lower':   '♠ 3–8', 'spades-upper':   '♠ 9–A',
}

// Case values for determining which case a card belongs to
const CASE_VALUES = {
  'hearts-lower':   ['3','4','5','6','7','8'],
  'hearts-upper':   ['9','10','J','Q','K','A'],
  'diamonds-lower': ['3','4','5','6','7','8'],
  'diamonds-upper': ['9','10','J','Q','K','A'],
  'clubs-lower':    ['3','4','5','6','7','8'],
  'clubs-upper':    ['9','10','J','Q','K','A'],
  'spades-lower':   ['3','4','5','6','7','8'],
  'spades-upper':   ['9','10','J','Q','K','A'],
}

// Given a card object, return which case it belongs to
function getCaseForCard(card) {
  const suitInitial = card.suit[0].toUpperCase()
  for (const [caseKey, values] of Object.entries(CASE_VALUES)) {
    const suit = caseKey.split('-')[0]
    if (suit === card.suit && values.includes(card.value)) return caseKey
  }
  return null
}

// A single face-down card shape for opponent stacks
function FaceDownCard() {
  return (
    <div style={{
      width: '11px', height: '18px',
      borderRadius: '2px',
      background: '#3a3a5a',
      border: '1px solid #555',
      marginLeft: '-3px',
      flexShrink: 0
    }}/>
  )
}

// Renders a player's face-down card fan
function CardFan({ count }) {
  const cards = Array.from({ length: Math.min(count, 12) })
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
      {cards.map((_, i) => (
        <FaceDownCard key={i}/>
      ))}
    </div>
  )
}

// Renders a player slot (opponent or teammate)
function PlayerSlot({ player, isMe, isTeammate, isSelected, isHinting, isTurn, onSelect }) {
  const borderColor = isSelected ? '#fac775'
    : isHinting ? '#378add'
    : isTeammate ? '#3b6d11'
    : '#3a3a3a'

  const bgColor = isSelected ? '#2a2210'
    : isHinting ? '#1a2030'
    : isTeammate ? '#1a2a1a'
    : '#222'

  const nameColor = isTeammate ? '#9fe1cb'
    : isSelected ? '#fac775'
    : '#e0e0e0'

  return (
    <div
      onClick={onSelect}
      style={{
        borderRadius: '10px',
        border: `1px solid ${borderColor}`,
        padding: '7px 8px',
        textAlign: 'center',
        background: bgColor,
        cursor: onSelect ? 'pointer' : 'default',
        boxSizing: 'border-box',
        width: '100%',
        boxShadow: isSelected || isHinting ? `0 0 0 1px ${borderColor}` : 'none'
      }}
    >
      <div style={{ fontSize: '9px', color: '#555', marginBottom: '2px', letterSpacing: '1px' }}>
        {isTeammate ? 'TEAMMATE' : 'OPPONENT'}{isSelected ? ' · SELECTED' : ''}
      </div>
      <div style={{ fontSize: '12px', fontWeight: '600', color: nameColor, marginBottom: '3px' }}>
        {isTurn ? '⭐ ' : ''}{player.name}
      </div>
      <CardFan count={player.cardCount}/>
      <div style={{ fontSize: '10px', color: '#777', marginTop: '2px' }}>
        {player.cardCount} cards
      </div>
      {isHinting && (
        <div style={{ fontSize: '10px', color: '#378add', marginTop: '3px', fontWeight: '500' }}>
          tap to select
        </div>
      )}
    </div>
  )
}

function Game({ socket, roomId }) {
  const [gameState, setGameState]       = useState(null)
  const [selectedCard, setSelectedCard] = useState(null)
  const [selectedTarget, setSelectedTarget] = useState(null)
  const [cardToAsk, setCardToAsk]       = useState(null)
  const [declareMode, setDeclareMode]   = useState(false)
  const [declareCaseKey, setDeclareCaseKey] = useState(null)
  const [error, setError]               = useState('')
  const [lastMove, setLastMove]         = useState(null)
  const [gameOver, setGameOver]         = useState(null)

  // Which step of the ask flow are we on? 0 = idle
  const askStep = !selectedTarget ? 0
    : !selectedCard ? 1
    : !cardToAsk ? 2
    : 3

  useEffect(() => {
    // Request current game state immediately on mount —
    // fixes mobile timing issue where game-update arrives
    // before the component is ready to receive it
    socket.emit('request-game-state')
    socket.on('game-update', (state) => {
      setGameState(state)
      setError('')
    })

    socket.on('ask-result', (result) => {
      setLastMove(result)
      setSelectedCard(null)
      setSelectedTarget(null)
      setCardToAsk(null)
    })

    socket.on('declaration-result', (result) => {
      setLastMove({ ...result, isDeclare: true })
      setDeclareMode(false)
      setDeclareCaseKey(null)
      setSelectedCard(null)
    })

    socket.on('game-over', (result) => {
      setGameOver(result)
    })

    socket.on('error', (message) => {
      setError(message)
    })

    return () => {
      socket.off('game-update')
      socket.off('ask-result')
      socket.off('declaration-result')
      socket.off('game-over')
      socket.off('error')
    }
  }, [])

  if (!gameState) return (
    <p style={{ padding: '40px', color: '#888', fontFamily: 'sans-serif' }}>
      Loading game...
    </p>
  )

  const myId = gameState.myId
  const myTeam = gameState.myTeam
  const opposingTeam = myTeam === 'A' ? 'B' : 'A'
  const isMyTurn = gameState.currentTurn === myId
  const myPlayer = gameState.players[myId]
  const myHand = myPlayer.hand

  // Sort players into positions around the table
  // Teams: my teammate is across (top), opponents are left and right
  const teammateId = gameState.teams[myTeam].find(id => id !== myId)
  const teammate = gameState.players[teammateId]
  const opponentIds = gameState.teams[opposingTeam]
  const leftOpponent = gameState.players[opponentIds[0]]
  const rightOpponent = gameState.players[opponentIds[1]]

  // Which cards can we ask for based on the selected base card?
  const getAskableCards = () => {
    if (!selectedCard) return []
    const caseKey = getCaseForCard(selectedCard)
    if (!caseKey) return []
    const suit = caseKey.split('-')[0]
    const suitInitial = suit[0].toUpperCase()
    const values = CASE_VALUES[caseKey]
    const allIds = values.map(v => v + suitInitial)
    const myIds = myHand.map(c => c.id)
    return allIds.filter(id => !myIds.includes(id))
  }

  // Called when player clicks a card in their hand
  const handleCardClick = (card) => {
    if (!isMyTurn) return

    if (declareMode) {
      // In declare mode, clicking a card selects its case for declaration
      const caseKey = getCaseForCard(card)
      setDeclareCaseKey(caseKey === declareCaseKey ? null : caseKey)
      return
    }

    // In ask mode, clicking selects the base card
    setSelectedCard(selectedCard?.id === card.id ? null : card)
    setCardToAsk(null)
  }

  // Called when player clicks Ask for card button
  const handleAskMode = () => {
    setDeclareMode(false)
    setDeclareCaseKey(null)
  }

  // Called when player clicks Declare case button
  const handleDeclareMode = () => {
    setDeclareMode(true)
    setSelectedCard(null)
    setSelectedTarget(null)
    setCardToAsk(null)
  }

  // Called when player clicks an opponent
  const handleTargetSelect = (playerId) => {
    if (!isMyTurn || declareMode) return
    if (gameState.teams[myTeam].includes(playerId)) return
    if (gameState.players[playerId].cardCount === 0) return
    setSelectedTarget(selectedTarget === playerId ? null : playerId)
    setCardToAsk(null)
  }

  // Submit the ask to the server
  const handleAsk = () => {
    if (!selectedTarget || !cardToAsk) return
    socket.emit('ask-card', { targetId: selectedTarget, cardId: cardToAsk })
  }

  // Submit the declaration to the server
  const handleDeclare = () => {
    if (!declareCaseKey) return
    socket.emit('declare-case', { caseKey: declareCaseKey })
  }

  // --- GAME OVER SCREEN ---
  if (gameOver) {
    return (
      <div style={{
        padding: '40px', fontFamily: 'sans-serif',
        background: '#2a2a2a', minHeight: '100vh', color: '#e8e8e8'
      }}>
        <h1 style={{ letterSpacing: '3px', color: '#888' }}>L I T T</h1>
        <h2 style={{ color: '#fac775' }}>
          {gameOver.winner === 'draw' ? "It's a draw!" : `Team ${gameOver.winner} wins!`}
        </h2>
        <p style={{ color: '#888' }}>{gameOver.message}</p>
        <p style={{ color: '#888' }}>
          Final score — Team A: {gameState.score.A} · Team B: {gameState.score.B}
        </p>
      </div>
    )
  }

  // --- MAIN GAME TABLE ---
  return (
    <div style={{
      background: '#2a2a2a',
      borderRadius: '14px',
      padding: '14px',
      fontFamily: 'sans-serif',
      color: '#e8e8e8',
      maxWidth: '480px',
      margin: '0 auto',
      position: 'relative'
    }}>

      {/* Declare modal overlay */}
      {declareMode && declareCaseKey && (
        <DeclareModal
          caseKey={declareCaseKey}
          myHand={myHand}
          onConfirm={handleDeclare}
          onCancel={() => { setDeclareCaseKey(null) }}
        />
      )}

      {/* Title */}
      <div style={{ textAlign: 'center', fontSize: '12px', letterSpacing: '3px', color: '#888', marginBottom: '10px' }}>
        L I T T
      </div>

     {/* Room code + score bar */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
        <div style={{ fontSize: '11px', color: '#666', letterSpacing: '1px' }}>
          ROOM CODE: <span style={{ color: '#fac775', fontWeight: '600', letterSpacing: '2px' }}>{roomId}</span>
          <span style={{ color: '#555', marginLeft: '8px', fontSize: '10px' }}>— share this to rejoin</span>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{ padding: '3px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: '#1f3520', color: '#9fe1cb', border: '1px solid #3b6d11' }}>
          Team A: {gameState.score.A}{myTeam === 'A' ? ' (you)' : ''}
        </div>
        <div style={{ padding: '3px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: '#3a1f1f', color: '#f0997b', border: '1px solid #712b13' }}>
          Team B: {gameState.score.B}{myTeam === 'B' ? ' (you)' : ''}
        </div>
      </div>

      {/* Table layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 90px', gridTemplateRows: 'auto auto auto', gap: '8px', alignItems: 'center' }}>

        {/* Top: teammate */}
        <div style={{ gridColumn: '2', gridRow: '1', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {teammate && (
            <PlayerSlot
              player={teammate}
              isTeammate={true}
              isTurn={gameState.currentTurn === teammateId}
            />
          )}
        </div>

        {/* Left: opponent */}
        <div style={{ gridColumn: '1', gridRow: '2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {leftOpponent && (
            <PlayerSlot
              player={leftOpponent}
              isTeammate={false}
              isSelected={selectedTarget === leftOpponent.id}
              isHinting={isMyTurn && !declareMode && askStep === 0 && leftOpponent.cardCount > 0}
              isTurn={gameState.currentTurn === leftOpponent.id}
              onSelect={() => handleTargetSelect(leftOpponent.id)}
            />
          )}
        </div>

        {/* Center: cases + last move */}
        <div style={{ gridColumn: '2', gridRow: '2' }}>
          <div style={{ background: '#1e1e1e', borderRadius: '10px', padding: '10px' }}>

            {/* Cases grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '4px', marginBottom: '8px' }}>
              {Object.entries(gameState.cases).map(([key, caseData]) => (
                <div
                  key={key}
                  style={{
                    borderRadius: '5px',
                    padding: '4px 2px',
                    textAlign: 'center',
                    fontSize: '10px',
                    fontWeight: '500',
                    lineHeight: '1.4',
                    border: declareMode && declareCaseKey === key
                      ? '1px solid #639922'
                      : '1px solid #3a3a3a',
                    background: caseData.wonBy === 'A' ? '#1a2a1a'
                      : caseData.wonBy === 'B' ? '#2a1a1a'
                      : declareMode && declareCaseKey === key ? '#1a2a1a'
                      : '#2a2a2a',
                    color: caseData.wonBy === 'A' ? '#9fe1cb'
                      : caseData.wonBy === 'B' ? '#f0997b'
                      : declareMode && declareCaseKey === key ? '#9fe1cb'
                      : '#888',
                    boxShadow: declareMode && declareCaseKey === key
                      ? '0 0 0 1px #639922' : 'none'
                  }}
                >
                  {CASE_NAMES[key]}
                  {caseData.wonBy && <div style={{ fontSize: '9px' }}>Team {caseData.wonBy}</div>}
                </div>
              ))}
            </div>

            {/* Last move */}
            {lastMove && (
              <div style={{ background: '#161616', borderRadius: '8px', padding: '8px 10px' }}>
                <div style={{ fontSize: '9px', color: '#555', marginBottom: '6px', letterSpacing: '1px' }}>
                  LAST MOVE
                </div>
                {lastMove.isDeclare ? (
                  <div style={{ fontSize: '11px', color: '#888' }}>
                    <div style={{ textAlign: 'center', marginBottom: '6px', color: lastMove.caseWonBy === gameState?.myTeam ? '#9fe1cb' : '#f0997b', fontWeight: '600' }}>
                      {lastMove.message}
                    </div>
                    {/* Show composition — who held which cards */}
                    {lastMove.composition && Object.values(lastMove.composition).map(entry => (
                      <div key={entry.name} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginBottom: '3px',
                        fontSize: '10px'
                      }}>
                        <span style={{
                          color: entry.role === 'opponent' ? '#f0997b' : '#9fe1cb',
                          minWidth: '50px',
                          fontWeight: '500'
                        }}>
                          {entry.name}:
                        </span>
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                          {entry.cards.map(cardId => {
                            const isRed = ['H','D'].includes(cardId.slice(-1))
                            return (
                              <span key={cardId} style={{
                                background: '#f5f0e8',
                                borderRadius: '3px',
                                padding: '1px 4px',
                                fontSize: '10px',
                                fontWeight: '700',
                                color: isRed ? '#cc0000' : '#111'
                              }}>
                                {cardId}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                      {/* Arrow direction depends on hit or miss */}
                      {lastMove.hit ? (
                        <>
                          <div style={{ background: '#2a2a2a', border: '1px solid #444', borderRadius: '5px', padding: '3px 8px', fontSize: '11px', color: '#ccc' }}>
                            {gameState.players[lastMove.targetId]?.name}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <div style={{ background: '#f5f0e8', borderRadius: '3px', padding: '2px 5px', fontSize: '11px', fontWeight: '700', border: '1px solid #bbb', color: ['H','D'].includes(lastMove.card?.slice(-1)) ? '#cc0000' : '#111' }}>
                              {lastMove.card}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <div style={{ width: '28px', height: '2px', background: '#639922' }}/>
                              <div style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '6px solid #639922' }}/>
                            </div>
                          </div>
                          <div style={{ background: '#2a2a2a', border: '1px solid #444', borderRadius: '5px', padding: '3px 8px', fontSize: '11px', color: '#ccc' }}>
                            {gameState.players[lastMove.askingId]?.name}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#993c1d', textAlign: 'center' }}>
                          {gameState.players[lastMove.askingId]?.name} asked for {lastMove.card} — miss
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '4px', color: lastMove.hit ? '#639922' : '#993c1d' }}>
                      {lastMove.hit
                        ? `hit — ${gameState.players[lastMove.askingId]?.name} keeps the turn`
                        : `${gameState.players[lastMove.nextTurn] ? gameState.players[lastMove.nextTurn].name : ''}'s turn`
                      }
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: opponent */}
        <div style={{ gridColumn: '3', gridRow: '2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {rightOpponent && (
            <PlayerSlot
              player={rightOpponent}
              isTeammate={false}
              isSelected={selectedTarget === rightOpponent.id}
              isHinting={isMyTurn && !declareMode && askStep === 0 && rightOpponent.cardCount > 0}
              isTurn={gameState.currentTurn === rightOpponent.id}
              onSelect={() => handleTargetSelect(rightOpponent.id)}
            />
          )}
        </div>

        {/* Bottom: my controls */}
        <div style={{ gridColumn: '1/-1', gridRow: '3' }}>

          {/* Error message */}
          {error && (
            <div style={{ color: '#f0997b', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Step panel — only shown on my turn */}
          {isMyTurn && (
            <div style={{ background: '#1e1e1e', borderRadius: '10px', padding: '10px 12px', marginBottom: '8px', border: '1px solid #2e2e2e' }}>

              {declareMode ? (
                // Declare flow
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#185fa5', color: '#b5d4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                    1
                  </div>
                  <div style={{ fontSize: '12px', color: '#85b7eb', fontWeight: '500', lineHeight: '1.5' }}>
                    Tap any card in your hand to select that case
                  </div>
                </div>
              ) : (
                // Ask flow — 3 steps
                <>
                  {/* Step 1 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: askStep > 0 ? '#3b6d11' : '#185fa5', color: askStep > 0 ? '#c0dd97' : '#b5d4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                      1
                    </div>
                    <div style={{ fontSize: '12px', color: askStep > 0 ? '#639922' : '#85b7eb', fontWeight: askStep === 0 ? '500' : '400', lineHeight: '1.5' }}>
                      {askStep > 0
                        ? `Opponent selected — ${gameState.players[selectedTarget]?.name}`
                        : 'Select an opponent — tap Bob or Dave'
                      }
                    </div>
                  </div>
                  {/* Step 2 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: askStep > 1 ? '#3b6d11' : askStep === 1 ? '#185fa5' : '#2a2a2a', color: askStep > 1 ? '#c0dd97' : askStep === 1 ? '#b5d4f4' : '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0, border: askStep < 1 ? '1px solid #333' : 'none' }}>
                      2
                    </div>
                    <div style={{ fontSize: '12px', color: askStep > 1 ? '#639922' : askStep === 1 ? '#85b7eb' : '#444', fontWeight: askStep === 1 ? '500' : '400', lineHeight: '1.5' }}>
                      {askStep > 1
                        ? `Base card — ${selectedCard?.value}${selectedCard ? ({'hearts':'♥','diamonds':'♦','clubs':'♣','spades':'♠'}[selectedCard.suit]) : ''}`
                        : 'Pick a base card from your hand'
                      }
                    </div>
                  </div>
                  {/* Step 3 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: askStep === 3 ? '#3b6d11' : askStep === 2 ? '#185fa5' : '#2a2a2a', color: askStep === 3 ? '#c0dd97' : askStep === 2 ? '#b5d4f4' : '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0, border: askStep < 2 ? '1px solid #333' : 'none' }}>
                      3
                    </div>
                    <div style={{ fontSize: '12px', color: askStep === 3 ? '#639922' : askStep === 2 ? '#85b7eb' : '#444', fontWeight: askStep === 2 ? '500' : '400', lineHeight: '1.5' }}>
                      {askStep === 3
                        ? `Asking for ${cardToAsk}`
                        : 'Choose which card to ask for'
                      }
                    </div>
                  </div>
                  {/* Askable cards — shown at step 2 */}
                  {askStep >= 1 && selectedCard && (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '8px', paddingLeft: '28px' }}>
                      {getAskableCards().length === 0
                        ? <span style={{ fontSize: '11px', color: '#666' }}>You hold all cards in this case</span>
                        : getAskableCards().map(cardId => {
  // Parse the card ID to get value and suit for display
  // Card IDs are like '3H', '10S', 'KD' — last char is suit initial
  const suitInitial = cardId.slice(-1)
  const value = cardId.slice(0, -1)
  const suitSymbols = { H: '♥', D: '♦', C: '♣', S: '♠' }
  const suitColors = { H: '#cc0000', D: '#cc0000', C: '#111111', S: '#111111' }
  const symbol = suitSymbols[suitInitial]
  const color = suitColors[suitInitial]

  return (
    <div
      key={cardId}
      onClick={() => setCardToAsk(cardToAsk === cardId ? null : cardId)}
      style={{
        width: '38px',
        height: '54px',
        borderRadius: '5px',
        background: '#f5f0e8',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: cardToAsk === cardId
          ? '2px solid #378add'
          : '2px solid transparent',
        cursor: 'pointer',
        color,
        transform: cardToAsk === cardId ? 'translateY(-5px)' : 'none',
        transition: 'all 0.1s ease',
        flexShrink: 0,
        boxShadow: cardToAsk === cardId ? '0 0 0 1px #378add' : 'none'
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: '700', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '13px', lineHeight: 1, marginTop: '2px' }}>{symbol}</div>
    </div>
  )
})
                      }
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button
              onClick={isMyTurn && askStep === 3 ? handleAsk : handleAskMode}
              disabled={!isMyTurn}
              style={{
                flex: 1, padding: '10px',
                borderRadius: '8px',
                border: isMyTurn && !declareMode ? '2px solid #fac775' : 'none',
                background: isMyTurn ? '#1565c0' : '#1a1a1a',
                color: isMyTurn ? '#ffffff' : '#3a3a3a',
                fontSize: '14px', fontWeight: '700',
                cursor: isMyTurn ? 'pointer' : 'default'
              }}
            >
              {isMyTurn && askStep === 3 ? 'Confirm ask' : 'Ask for card'}
            </button>
            <button
              onClick={handleDeclareMode}
              disabled={!isMyTurn}
              style={{
                flex: 1, padding: '10px',
                borderRadius: '8px',
                border: isMyTurn && declareMode ? '2px solid #fac775' : 'none',
                background: isMyTurn ? '#2e7d32' : '#1a1a1a',
                color: isMyTurn ? '#ffffff' : '#3a3a3a',
                fontSize: '14px', fontWeight: '700',
                cursor: isMyTurn ? 'pointer' : 'default'
              }}
            >
              Declare case
            </button>
          </div>

          {/* Hand */}
          <Hand
            cards={myHand}
            isMyTurn={isMyTurn}
            onSelectCard={handleCardClick}
            selectedCard={selectedCard}
            declareMode={declareMode}
            declareCaseKey={declareCaseKey}
          />
        </div>
      </div>
    </div>
  )
}

export default Game