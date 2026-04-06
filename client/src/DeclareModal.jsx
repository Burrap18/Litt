// DeclareModal.jsx — confirmation popup when a player declares a case
// Shows which cards they hold in that case and asks Yes / Cancel

const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }
const SUIT_COLORS = { hearts: '#cc0000', diamonds: '#cc0000', clubs: '#e8e8e8', spades: '#e8e8e8' }

const CASE_NAMES = {
  'hearts-lower':   '♥ 3–8', 'hearts-upper':   '♥ 9–A',
  'diamonds-lower': '♦ 3–8', 'diamonds-upper': '♦ 9–A',
  'clubs-lower':    '♣ 3–8', 'clubs-upper':    '♣ 9–A',
  'spades-lower':   '♠ 3–8', 'spades-upper':   '♠ 9–A',
}

// The cards that belong to each case
const CASE_CARD_VALUES = {
  'hearts-lower':   ['3','4','5','6','7','8'],
  'hearts-upper':   ['9','10','J','Q','K','A'],
  'diamonds-lower': ['3','4','5','6','7','8'],
  'diamonds-upper': ['9','10','J','Q','K','A'],
  'clubs-lower':    ['3','4','5','6','7','8'],
  'clubs-upper':    ['9','10','J','Q','K','A'],
  'spades-lower':   ['3','4','5','6','7','8'],
  'spades-upper':   ['9','10','J','Q','K','A'],
}

function DeclareModal({ caseKey, myHand, onConfirm, onCancel }) {
  // Find which cards the player holds in this case
  const caseValues = CASE_CARD_VALUES[caseKey]
  const suit = caseKey.split('-')[0]
  const suitInitial = suit[0].toUpperCase()
  const allCaseCardIds = caseValues.map(v => v + suitInitial)

  // Filter the player's hand to only show cards in this case
  const myCardsInCase = myHand.filter(card => allCaseCardIds.includes(card.id))
  const missingCount = 6 - myCardsInCase.length

  return (
    // Semi-transparent overlay behind the modal
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      borderRadius: '14px'
    }}>
      <div style={{
        background: '#1e1e1e',
        border: '1px solid #3a3a3a',
        borderRadius: '12px',
        padding: '20px 24px',
        maxWidth: '280px',
        width: '90%'
      }}>
        {/* Case name */}
        <div style={{ fontSize: '13px', color: '#888', marginBottom: '6px', letterSpacing: '1px' }}>
          DECLARE CASE
        </div>
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#e8e8e8', marginBottom: '14px' }}>
          {CASE_NAMES[caseKey]}
        </div>

        {/* Cards the player holds in this case */}
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
          Your cards in this case:
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {myCardsInCase.map(card => (
            <div key={card.id} style={{
              width: '38px', height: '54px',
              borderRadius: '5px',
              background: '#f5f0e8',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              border: '2px solid #639922',
              color: SUIT_COLORS[card.suit]
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: '13px', lineHeight: 1, marginTop: '2px' }}>
                {SUIT_SYMBOLS[card.suit]}
              </div>
            </div>
          ))}
        </div>

        {/* Message about missing cards */}
        {missingCount > 0 ? (
          <div style={{
            fontSize: '12px',
            color: '#fac775',
            background: '#2a2210',
            border: '1px solid #854f0b',
            borderRadius: '6px',
            padding: '8px 10px',
            marginBottom: '16px'
          }}>
            You are missing {missingCount} card{missingCount > 1 ? 's' : ''} —
            you are betting your partner holds {missingCount === 1 ? 'it' : 'them'}.
            If any opponent holds even one, you lose this case.
          </div>
        ) : (
          <div style={{
            fontSize: '12px',
            color: '#9fe1cb',
            background: '#1a2a1a',
            border: '1px solid #3b6d11',
            borderRadius: '6px',
            padding: '8px 10px',
            marginBottom: '16px'
          }}>
            You hold all 6 cards — guaranteed win!
          </div>
        )}

        {/* Confirm / Cancel buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '10px',
              borderRadius: '8px', border: 'none',
              background: '#2e7d32', color: '#ffffff',
              fontSize: '14px', fontWeight: '700', cursor: 'pointer'
            }}
          >
            Yes, declare
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px',
              borderRadius: '8px',
              border: '1px solid #444',
              background: '#2a2a2a', color: '#aaa',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeclareModal