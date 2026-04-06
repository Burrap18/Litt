// Hand.jsx — displays the player's cards grouped by case
// Cards are sorted: lower ♥ ♠ ♦ ♣ then upper ♥ ♠ ♦ ♣

const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }
const SUIT_COLORS = { hearts: '#cc0000', diamonds: '#cc0000', clubs: '#111', spades: '#111' }

// The order we display case groups
const CASE_ORDER = [
  'hearts-lower', 'spades-lower', 'diamonds-lower', 'clubs-lower',
  'hearts-upper', 'spades-upper', 'diamonds-upper', 'clubs-upper'
]

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

// Groups the hand into cases, sorted by CASE_ORDER
function groupHandByCases(cards) {
  const groups = {}
  CASE_ORDER.forEach(caseKey => {
    const suit = caseKey.split('-')[0]
    const suitInitial = suit[0].toUpperCase()
    const values = CASE_VALUES[caseKey]
    const allIds = values.map(v => v + suitInitial)
    // Find which of these cards the player actually holds
    const held = cards.filter(c => allIds.includes(c.id))
    // Sort held cards by value order
    held.sort((a, b) => values.indexOf(a.value) - values.indexOf(b.value))
    if (held.length > 0) groups[caseKey] = held
  })
  return groups
}

function Hand({ cards, isMyTurn, onSelectCard, selectedCard, declareMode, declareCaseKey }) {
  const groups = groupHandByCases(cards)
  const isLower = caseKey => caseKey.includes('lower')

  return (
    <div style={{
      background: '#1e1e1e',
      borderRadius: '10px',
      padding: '10px',
      border: '1px solid #2e2e2e'
    }}>
      <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
        Your hand · {cards.length} cards
      </div>

      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
    {CASE_ORDER.map((caseKey, idx) => {
          const group = groups[caseKey]
          if (!group) return null

          const isFirstUpper = caseKey === 'hearts-upper'
          // Find if there is any visible group before this one
          const anyGroupBefore = CASE_ORDER.slice(0, idx).some(k => groups[k])

          return (
            <div key={caseKey} style={{ display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
              {/* Divider before every case group except the first visible one */}
              {anyGroupBefore && (
                <div style={{
                  width: '1px',
                  height: '56px',
                  background: isFirstUpper ? '#666' : '#3a3a3a',
                  margin: isFirstUpper ? '0 8px' : '0 4px'
                }}/>
              )}

              {/* Cards in this case group */}
              {group.map(card => {
                const isSelected = selectedCard?.id === card.id
                // In declare mode, highlight all cards in the selected case
                const isDeclareHighlight = declareMode && declareCaseKey === caseKey

                return (
                  <div
                    key={card.id}
                    onClick={() => isMyTurn && onSelectCard(card)}
                    style={{
                      width: '38px',
                      height: '56px',
                      borderRadius: '5px',
                      background: '#f5f0e8',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isMyTurn ? 'pointer' : 'default',
                      // Blue border for ask mode selection
                      border: isSelected
                        ? '2px solid #378add'
                        : isDeclareHighlight
                        // Green border for declare mode highlight
                        ? '2px solid #639922'
                        : '2px solid transparent',
                      // Lift selected card
                      transform: isSelected ? 'translateY(-7px)' : 'none',
                      transition: 'all 0.1s ease',
                      color: SUIT_COLORS[card.suit],
                      flexShrink: 0
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '700', lineHeight: 1 }}>
                      {card.value}
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: 1, marginTop: '2px' }}>
                      {SUIT_SYMBOLS[card.suit]}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Hand