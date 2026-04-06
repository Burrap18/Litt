// --- DECK SETUP ---

// Define the four suits in the game
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades']

// Define the card values in each suit — no 2s in Litt.
// The order matters: it goes from lowest to highest,
// which we'll use later for the tiebreaker rule.
const VALUES = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

// Define the 8 cases — each suit has a lower and upper case.
// Lower = 3 to 8, Upper = 9 to A.
// Each case tracks which cards belong to it and who won it.
const CASES = {
  'hearts-lower':   { suit: 'hearts',   values: ['3','4','5','6','7','8'], wonBy: null },
  'hearts-upper':   { suit: 'hearts',   values: ['9','10','J','Q','K','A'], wonBy: null },
  'diamonds-lower': { suit: 'diamonds', values: ['3','4','5','6','7','8'], wonBy: null },
  'diamonds-upper': { suit: 'diamonds', values: ['9','10','J','Q','K','A'], wonBy: null },
  'clubs-lower':    { suit: 'clubs',    values: ['3','4','5','6','7','8'], wonBy: null },
  'clubs-upper':    { suit: 'clubs',    values: ['9','10','J','Q','K','A'], wonBy: null },
  'spades-lower':   { suit: 'spades',   values: ['3','4','5','6','7','8'], wonBy: null },
  'spades-upper':   { suit: 'spades',   values: ['9','10','J','Q','K','A'], wonBy: null },
}

// --- HELPER FUNCTIONS ---

// Builds the full 48-card deck (no 2s).
// Each card is an object with a suit, value, and a combined id
// like 'AH' for Ace of Hearts or '10S' for 10 of Spades.
function buildDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({
        id: value + suit[0].toUpperCase(), // e.g. 'AH', '10S', '3D'
        suit,                               // e.g. 'hearts'
        value                               // e.g. 'A', '10', '3'
      })
    }
  }
  return deck // returns 48 cards total
}

// Shuffles an array randomly using the Fisher-Yates algorithm.
// This is the standard correct way to shuffle — it gives every
// possible ordering an equal chance.
function shuffle(array) {
  const arr = [...array] // copy the array so we don't modify the original
  for (let i = arr.length - 1; i > 0; i--) {
    // Pick a random index from 0 to i
    const j = Math.floor(Math.random() * (i + 1))
    // Swap elements at i and j
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Given a card id like 'AH', figure out which case it belongs to.
// Returns a case key like 'hearts-upper' or 'spades-lower'.
function getCaseForCard(cardId) {
  for (const [caseKey, caseData] of Object.entries(CASES)) {
    // Check if this card's suit matches the case's suit
    // and if this card's value is in the case's value list
    if (
      cardId.slice(-1) === caseData.suit[0].toUpperCase() &&
      caseData.values.includes(cardId.slice(0, -1))
    ) {
      return caseKey
    }
  }
  return null
}

// Returns the rank of a card value for tiebreaking purposes.
// Higher index = higher card. A is highest, 3 is lowest.
function getCardRank(value) {
  return VALUES.indexOf(value) // e.g. '3' returns 0, 'A' returns 11
}

// --- TEAM ASSIGNMENT ---

// Assigns the 4 players into 2 teams.
// Players sitting opposite each other are teammates:
// P0 & P2 are Team A, P1 & P3 are Team B.
function assignTeams(players) {
  // For a full 4 player game: P0 & P2 are Team A, P1 & P3 are Team B
  // For dev testing with 2 players: P0 is Team A, P1 is Team B
  if (players.length === 4) {
    return {
      A: [players[0].id, players[2].id],
      B: [players[1].id, players[3].id]
    }
  } else {
    // 2 player dev mode — one player per team
    return {
      A: [players[0].id],
      B: [players[1].id]
    }
  }
}

// Returns which team a given playerId belongs to
function getTeamForPlayer(playerId, teams) {
  if (teams.A.includes(playerId)) return 'A'
  if (teams.B.includes(playerId)) return 'B'
  return null
}

// Returns the teammate of a given player
function getTeammate(playerId, teams) {
  const team = teams.A.includes(playerId) ? teams.A : teams.B
  // Return the other player in the same team
  return team.find(id => id !== playerId)
}

// --- DEALING ---

// The main function that sets up a new game.
// Takes the array of players from the lobby and returns
// a fully initialized game state object.
function initializeGame(players) {

  // Build and shuffle the 48-card deck
  const deck = shuffle(buildDeck())

  // Build and shuffle the 4 twos — used only to determine starting player
  const twos = shuffle([
    { id: '2H', suit: 'hearts' },
    { id: '2D', suit: 'diamonds' },
    { id: '2C', suit: 'clubs' },
    { id: '2S', suit: 'spades' }
  ])

  // Deal one two to each player face up —
  // whoever gets the 2 of hearts starts the game
  let startingPlayerId = null
  const playerTwos = {}
  players.forEach((player, index) => {
    playerTwos[player.id] = twos[index]
    if (twos[index].id === '2H') {
      startingPlayerId = player.id
    }
  })

  // Dev mode fallback — if no one drew 2H (because we only
  // dealt 2 of the 4 twos), just give the first player the turn
  if (!startingPlayerId) {
    startingPlayerId = players[0].id
  }

  // Deal 12 cards to each player from the shuffled deck
  const hands = {}
  players.forEach((player, index) => {
    // slice(start, end) cuts out 12 cards per player:
    // player 0 gets cards 0-11, player 1 gets 12-23, etc.
    hands[player.id] = deck.slice(index * 12, (index + 1) * 12)
  })

  // Assign teams based on seating order
  const teams = assignTeams(players)

  // Build the initial player objects with their hands and card counts
  const playerMap = {}
  players.forEach(player => {
    playerMap[player.id] = {
      id: player.id,
      name: player.name,
      isHost: player.isHost,
      hand: hands[player.id],      // their 12 cards
      cardCount: 12,               // visible to everyone
      twoCard: playerTwos[player.id] // the 2 they were dealt
    }
  })

  // Return the complete initial game state
  return {
    players: playerMap,           // all player data including hands
    teams,                        // { A: [id, id], B: [id, id] }
    cases: { ...CASES },          // deep copy of the 8 cases
    score: { A: 0, B: 0 },        // cases won by each team
    currentTurn: startingPlayerId,// id of player who goes first
    status: 'in-progress',
    winner: null
  }
}

// --- VIEW FILTERING ---

// Builds the version of game state that a specific player is allowed to see.
// Every player gets their own hand in full, but only card COUNTS for others.
function buildViewFor(playerId, gameState) {
  const { players, teams, cases, score, currentTurn, winner } = gameState

  // Build a sanitized version of each player —
  // full hand for self, just count for others
  const playerViews = {}
  for (const [id, player] of Object.entries(players)) {
    if (id === playerId) {
      // This is the requesting player — send their full hand
      playerViews[id] = {
        id: player.id,
        name: player.name,
        hand: player.hand,       // full hand — only they see this
        cardCount: player.cardCount,
        twoCard: player.twoCard,
        isHost: player.isHost
      }
    } else {
      // This is another player — hide their hand, just show count
      playerViews[id] = {
        id: player.id,
        name: player.name,
        hand: [],                // empty — they can't see others' cards
        cardCount: player.cardCount,
        twoCard: player.twoCard,
        isHost: player.isHost
      }
    }
  }

  return {
    myId: playerId,
    myTeam: getTeamForPlayer(playerId, teams),
    players: playerViews,
    teams,
    cases,
    score,
    currentTurn,
    winner
  }
}

// --- WIN CONDITION ---

// Checks if either team has won the game.
// Called after every successful declaration.
//
// Condition 1: A team reaches 5 cases → instant win, can't be beaten.
//
// Condition 2: After a successful declaration, if the declaring team
// has zero cards left between both players, the game ends immediately.
// Winner is determined by score at that moment — declaring team could
// win, lose, or draw depending on the score.
//
// 'declaringTeam' is passed in only when checking Condition 2 —
// it's the team that just made the successful declaration.
function checkWinCondition(gameState, declaringTeam = null) {
  const { score, players, teams } = gameState

  // --- Condition 1 ---
  // First team to 5 cases wins outright regardless of cards remaining
  if (score.A >= 5) return { winner: 'A', reason: 'reached 5 cases' }
  if (score.B >= 5) return { winner: 'B', reason: 'reached 5 cases' }

  // --- Condition 2 ---
  // Only check this if a declaration just happened
  if (declaringTeam) {

    // Get the two player IDs on the declaring team
    const declaringPlayerIds = teams[declaringTeam]

    // Count total cards held by both players on the declaring team
    const totalCards = declaringPlayerIds.reduce((sum, playerId) => {
      // reduce loops through the player IDs, accumulating a running total
      // For each player, add their card count to the sum
      return sum + players[playerId].cardCount
    }, 0) // 0 is the starting value of sum

    // If the declaring team has no cards left, game ends now
    if (totalCards === 0) {

      // Determine winner by current score
      if (score.A > score.B) return { winner: 'A', reason: 'out of cards' }
      if (score.B > score.A) return { winner: 'B', reason: 'out of cards' }

      // Scores are equal — it's a draw
      return { winner: 'draw', reason: 'out of cards, scores tied' }
    }
  }

  // No winner yet — game continues
  return null
}

// --- ASK CARD ---

// Handles the logic when a player asks an opponent for a card.
// Parameters:
//   gameState  — the full current game state
//   askingId   — the player who is asking
//   targetId   — the opponent being asked
//   cardId     — the card being requested e.g. 'AH'
// Returns an object describing what happened so index.js
// can broadcast the right update to all players.
function processAsk(gameState, askingId, targetId, cardId) {
  const { players, teams } = gameState

  const askingPlayer = players[askingId]
  const targetPlayer = players[targetId]

  // --- VALIDATION ---

  // Make sure it's actually this player's turn
  if (gameState.currentTurn !== askingId) {
    return { success: false, error: 'Not your turn' }
  }

  // Make sure the target is on the opposing team —
  // you can never ask your teammate
  const askingTeam = getTeamForPlayer(askingId, teams)
  const targetTeam = getTeamForPlayer(targetId, teams)
  if (askingTeam === targetTeam) {
    return { success: false, error: 'Cannot ask your teammate' }
  }

  // Make sure the target player actually has cards —
  // can't ask someone who is out of cards
  if (targetPlayer.cardCount === 0) {
    return { success: false, error: 'That player has no cards' }
  }

  // --- BASE CARD RULE ---
  // The asking player must hold at least one other card
  // from the same case as the card they're asking for.
  // e.g. to ask for AH, you must hold at least one of 9H 10H JH QH KH
  const requestedCase = getCaseForCard(cardId)
  if (!requestedCase) {
    return { success: false, error: 'Invalid card' }
  }

  // Check if the asking player holds at least one card from that case
  // other than the exact card they're asking for
  const hasBaseCard = askingPlayer.hand.some(card =>
    getCaseForCard(card.id) === requestedCase &&
    card.id !== cardId
  )

  if (!hasBaseCard) {
    return { success: false, error: 'You need a base card to ask for that' }
  }

  // --- RESOLVE THE ASK ---

  // Check if the target player actually has the requested card
  const cardIndex = targetPlayer.hand.findIndex(card => card.id === cardId)
  const targetHasCard = cardIndex !== -1

  if (targetHasCard) {
    // --- HIT ---
    // Remove the card from the target's hand
    const [card] = targetPlayer.hand.splice(cardIndex, 1)
    targetPlayer.cardCount--

    // Add it to the asking player's hand
    askingPlayer.hand.push(card)
    askingPlayer.cardCount++

    // Asking player keeps their turn on a successful ask
    gameState.currentTurn = askingId

    return {
      success: true,
      hit: true,
      card: cardId,
      askingId,
      targetId,
      nextTurn: askingId,
      message: `${askingPlayer.name} got ${cardId} from ${targetPlayer.name}`
    }

  } else {
    // --- MISS ---
    // Card not found — turn passes to the target player. Full stop.
    gameState.currentTurn = targetId

    return {
      success: true,
      hit: false,
      card: cardId,
      askingId,
      targetId,
      nextTurn: targetId,
      message: `${targetPlayer.name} doesn't have ${cardId} — ${targetPlayer.name}'s turn`
    }
  }
}

// --- DECLARE CASE ---

// Handles the logic when a player declares a case.
// Parameters:
//   gameState   — the full current game state
//   declaringId — the player making the declaration
//   caseKey     — which case is being declared e.g. 'spades-upper'
// Returns an object describing the outcome.
function processDeclare(gameState, declaringId, caseKey) {
  const { players, teams, cases, score } = gameState

  const declaringPlayer = players[declaringId]
  const declaringTeam = getTeamForPlayer(declaringId, teams)
  const opposingTeam = declaringTeam === 'A' ? 'B' : 'A'
const teammateId = getTeammate(declaringId, teams)

  // In 2 player dev mode there is no teammate —
  // create an empty placeholder so the rest of the logic doesn't break
  const teammate = teammateId
    ? players[teammateId]
    : { hand: [], cardCount: 0 }
  const opposingPlayerIds = teams[opposingTeam]

  // --- VALIDATION ---

  // Make sure it's this player's turn
  if (gameState.currentTurn !== declaringId) {
    return { success: false, error: 'Not your turn' }
  }

  // Make sure the case hasn't already been won
  if (cases[caseKey].wonBy !== null) {
    return { success: false, error: 'That case has already been declared' }
  }

  // Must hold at least one card from the case to declare it
  const caseData = cases[caseKey]

  // Build the list of all 6 card IDs in this case
  // e.g. ['3H','4H','5H','6H','7H','8H'] for hearts-lower
  const allCaseCardIds = caseData.values.map(value =>
    value + caseData.suit[0].toUpperCase()
  )

  // Find which cards the declaring player holds from this case
  const declarerCards = declaringPlayer.hand.filter(card =>
    allCaseCardIds.includes(card.id)
  )

  if (declarerCards.length === 0) {
    return { success: false, error: 'You have no cards in that case' }
  }

  // --- CHECK WHO HOLDS WHAT ---
  // Before removing any cards, record how many each player holds.
  // We need this for turn determination after the declaration.

  // Cards from this case held by teammate
  const teammateCards = teammate.hand.filter(card =>
    allCaseCardIds.includes(card.id)
  )

  // Cards from this case held by each opponent
  // opponentCards is a map of { playerId: [cards] }
  const opponentCards = {}
  let opponentsHoldAny = false

  opposingPlayerIds.forEach(playerId => {
    const cards = players[playerId].hand.filter(card =>
      allCaseCardIds.includes(card.id)
    )
    opponentCards[playerId] = cards
    if (cards.length > 0) opponentsHoldAny = true
  })

 // --- REMOVE ALL 6 CARDS FROM ALL HANDS ---// --- REMOVE ALL 6 CARDS FROM ALL HANDS ---
  // This always happens regardless of whether declaration succeeded or failed.
  // Filter out undefined playerIds first to handle 2 player dev mode
  ;[declaringId, teammateId, ...opposingPlayerIds]
    .filter(playerId => playerId && players[playerId])
    .forEach(playerId => {
      players[playerId].hand = players[playerId].hand.filter(card =>
        !allCaseCardIds.includes(card.id)
      )
      players[playerId].cardCount = players[playerId].hand.length
    })

  // --- RESOLVE THE DECLARATION ---

  let winningTeam
  let nextTurn

  if (!opponentsHoldAny) {
    // --- SUCCESSFUL DECLARATION ---
    // No opponent held any card from this case —
    // declaring team wins it.
    winningTeam = declaringTeam

    // Update score and mark case as won
    score[winningTeam]++
    cases[caseKey].wonBy = winningTeam

    // --- CHECK WIN CONDITION (Priority 1) ---
    const winResult = checkWinCondition(gameState, declaringTeam)
    if (winResult) {
      gameState.winner = winResult.winner
      gameState.status = 'finished'
      return {
        success: true,
        caseWonBy: winningTeam,
        caseKey,
        gameOver: true,
        winner: winResult.winner,
        reason: winResult.reason,
        message: `Team ${winningTeam} wins ${caseKey}! Game over — ${winResult.reason}`
      }
    }

    // --- DETERMINE NEXT TURN ---

    // Priority 2: Exactly one player on declaring team is out of cards →
    // the player who still has cards gets the turn,
    // regardless of who declared
    if (declaringPlayer.cardCount === 0 && teammate.cardCount > 0) {
      // Declaring player is out, teammate still has cards
      nextTurn = teammateId
    } else if (teammate.cardCount === 0 && declaringPlayer.cardCount > 0) {
      // Teammate is out, declaring player still has cards
      nextTurn = declaringId
    } else {
      // Priority 3: Normal turn rules —
      // declarer had all 6 cards → declarer keeps turn
      // teammate contributed some → teammate gets turn
      nextTurn = declarerCards.length === 6 ? declaringId : teammateId
    }

  } else {
    // --- FAILED DECLARATION ---
    // At least one opponent held a card from this case —
    // opposing team wins it.
    winningTeam = opposingTeam

    // Update score and mark case as won
    score[winningTeam]++
    cases[caseKey].wonBy = winningTeam

    // --- CHECK WIN CONDITION (Priority 1) ---
    const winResult = checkWinCondition(gameState, opposingTeam)
    if (winResult) {
      gameState.winner = winResult.winner
      gameState.status = 'finished'
      return {
        success: true,
        caseWonBy: winningTeam,
        caseKey,
        gameOver: true,
        winner: winResult.winner,
        reason: winResult.reason,
        message: `${declaringPlayer.name} declared prematurely — Team ${winningTeam} wins! Game over`
      }
    }

    // --- DETERMINE NEXT TURN after failed declaration ---

    // Step 1: Find which opponent wins the turn by normal rules —
    // the one who held the most cards from this case.
    // Tiebreaker: whoever held the highest ranked card.
    let bestOpponentId = null
    let bestCount = -1
    let bestRank = -1

    opposingPlayerIds.forEach(playerId => {
      // Only consider opponents who actually held cards in this case
      if (opponentCards[playerId].length === 0) return

      const count = opponentCards[playerId].length

      // Find the highest ranked card this opponent held in the case
      // We use opponentCards (recorded BEFORE removal) for this check
      const highestRank = Math.max(
        ...opponentCards[playerId].map(card => getCardRank(card.value))
      )

      // More cards wins. Equal cards → higher card wins.
      if (
        count > bestCount ||
        (count === bestCount && highestRank > bestRank)
      ) {
        bestCount = count
        bestRank = highestRank
        bestOpponentId = playerId
      }
    })

    // Fall back to first opposing player if somehow no one held cards
    bestOpponentId = bestOpponentId || opposingPlayerIds[0]

    // Step 2: Override if that player just ran out of cards
    // by putting down their cards in the bust.
    // Check cardCount AFTER cards were already removed above.
    if (players[bestOpponentId].cardCount === 0) {
      // Turn winner is now out — their teammate gets the turn instead
      nextTurn = getTeammate(bestOpponentId, teams)
    } else {
      // Normal case — turn winner still has cards
      nextTurn = bestOpponentId
    }
  }

  // Update the current turn in game state
  gameState.currentTurn = nextTurn

  return {
    success: true,
    caseWonBy: winningTeam,
    caseKey,
    gameOver: false,
    nextTurn,
    message: winningTeam === declaringTeam
      ? `Team ${winningTeam} wins ${caseKey}!`
      : `${declaringPlayer.name} declared prematurely — Team ${winningTeam} wins ${caseKey}!`
  }
}

// Export all the functions that index.js will need
module.exports = {
  initializeGame,
  buildViewFor,
  getCaseForCard,
  getCardRank,
  getTeamForPlayer,
  getTeammate,
  checkWinCondition,
  processAsk,
  processDeclare,
  CASES,
  VALUES
}