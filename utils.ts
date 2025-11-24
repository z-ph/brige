import { CardType, Rank, Suit, PlayerPosition, Bid, Trick } from './types';

const SUIT_ORDER = [Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades];
const RANK_ORDER = [
  Rank.Two, Rank.Three, Rank.Four, Rank.Five, Rank.Six, Rank.Seven,
  Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace
];

export const createDeck = (): CardType[] => {
  const deck: CardType[] = [];
  SUIT_ORDER.forEach((suit) => {
    RANK_ORDER.forEach((rank) => {
      deck.push({ suit, rank, id: `${suit}${rank}` });
    });
  });
  return deck;
};

export const shuffleDeck = (deck: CardType[]): CardType[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const sortHand = (hand: CardType[]): CardType[] => {
  return [...hand].sort((a, b) => {
    const suitDiff = SUIT_ORDER.indexOf(b.suit) - SUIT_ORDER.indexOf(a.suit); // Spades high visually usually
    if (suitDiff !== 0) return SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit); // Group by suit
    return RANK_ORDER.indexOf(b.rank) - RANK_ORDER.indexOf(a.rank); // High rank first
  });
};

export const getNextPlayer = (current: PlayerPosition): PlayerPosition => {
  const order = [PlayerPosition.North, PlayerPosition.East, PlayerPosition.South, PlayerPosition.West];
  const idx = order.indexOf(current);
  return order[(idx + 1) % 4];
};

export const getPartner = (player: PlayerPosition): PlayerPosition => {
  const order = [PlayerPosition.North, PlayerPosition.East, PlayerPosition.South, PlayerPosition.West];
  const idx = order.indexOf(player);
  return order[(idx + 2) % 4];
};

export const getSuitSymbol = (suit: Suit) => {
  switch (suit) {
    case Suit.Clubs: return '♣';
    case Suit.Diamonds: return '♦';
    case Suit.Hearts: return '♥';
    case Suit.Spades: return '♠';
  }
};

export const formatBid = (bid: Bid): string => {
  if (bid.type === 'Pass') return 'Pass';
  if (bid.type === 'Double') return 'X';
  if (bid.type === 'Redouble') return 'XX';
  return `${bid.level}${bid.suit === 'NT' ? 'NT' : getSuitSymbol(bid.suit as Suit)}`;
};

export const determineTrickWinner = (trick: Trick, trumpSuit: Suit | 'NT' | undefined): PlayerPosition => {
  if (trick.cards.length === 0) return PlayerPosition.North; // Should not happen

  const leadSuit = trick.leadSuit || trick.cards[0].card.suit;
  let winningCardIndex = 0;
  let bestCard = trick.cards[0].card;

  for (let i = 1; i < trick.cards.length; i++) {
    const currentCard = trick.cards[i].card;
    
    // If playing trump
    if (trumpSuit !== 'NT' && currentCard.suit === trumpSuit) {
      if (bestCard.suit !== trumpSuit) {
        bestCard = currentCard;
        winningCardIndex = i;
      } else if (RANK_ORDER.indexOf(currentCard.rank) > RANK_ORDER.indexOf(bestCard.rank)) {
        bestCard = currentCard;
        winningCardIndex = i;
      }
    } 
    // If following suit
    else if (currentCard.suit === leadSuit) {
      if (bestCard.suit !== trumpSuit) {
         if (currentCard.suit === bestCard.suit && RANK_ORDER.indexOf(currentCard.rank) > RANK_ORDER.indexOf(bestCard.rank)) {
            bestCard = currentCard;
            winningCardIndex = i;
         }
      }
    }
  }

  return trick.cards[winningCardIndex].player;
};

export const isValidCardPlay = (card: CardType, hand: CardType[], trick: Trick): boolean => {
  if (trick.cards.length === 0) return true; // Lead any card
  const leadSuit = trick.leadSuit;
  // If player has cards of lead suit, must play one
  const hasLeadSuit = hand.some(c => c.suit === leadSuit);
  if (hasLeadSuit) {
    return card.suit === leadSuit;
  }
  return true; // Can play anything if void in lead suit
};

// Simplified bidding validation
export const getValidBids = (history: Bid[]): Bid[] => {
  // Logic to determine lowest possible bid
  let lastBid: Bid | null = null;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].type === 'Bid') {
      lastBid = history[i];
      break;
    }
  }

  const validBids: Bid[] = [];
  
  // Pass is always valid
  validBids.push({ type: 'Pass', player: PlayerPosition.South }); // Player placeholder

  // Double/Redouble omitted for brevity in this helper, focused on level bids
  
  const levels = [1, 2, 3, 4, 5, 6, 7];
  const suits = [Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades, 'NT'];

  levels.forEach(level => {
    suits.forEach(suit => {
      if (!lastBid) {
        validBids.push({ type: 'Bid', level, suit: suit as any, player: PlayerPosition.South });
      } else {
        const lastSuitIdx = suits.indexOf(lastBid.suit as any);
        const currSuitIdx = suits.indexOf(suit as any);
        
        if (level > (lastBid.level || 0)) {
           validBids.push({ type: 'Bid', level, suit: suit as any, player: PlayerPosition.South });
        } else if (level === lastBid.level) {
           if (currSuitIdx > lastSuitIdx) {
             validBids.push({ type: 'Bid', level, suit: suit as any, player: PlayerPosition.South });
           }
        }
      }
    });
  });

  return validBids;
};
