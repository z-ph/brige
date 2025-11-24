export enum Suit {
  Clubs = 'C',
  Diamonds = 'D',
  Hearts = 'H',
  Spades = 'S',
}

export enum Rank {
  Two = '2',
  Three = '3',
  Four = '4',
  Five = '5',
  Six = '6',
  Seven = '7',
  Eight = '8',
  Nine = '9',
  Ten = 'T',
  Jack = 'J',
  Queen = 'Q',
  King = 'K',
  Ace = 'A',
}

export interface CardType {
  suit: Suit;
  rank: Rank;
  id: string; // Unique ID for React keys
}

export enum PlayerPosition {
  North = 'North',
  East = 'East',
  South = 'South',
  West = 'West',
}

export enum GamePhase {
  Dealing = 'Dealing',
  Bidding = 'Bidding',
  Playing = 'Playing',
  Score = 'Score',
}

export interface Bid {
  level?: number;
  suit?: Suit | 'NT';
  type: 'Bid' | 'Pass' | 'Double' | 'Redouble';
  player: PlayerPosition;
}

export interface Trick {
  cards: { player: PlayerPosition; card: CardType }[];
  leadSuit?: Suit;
  winner?: PlayerPosition;
}

export interface GameState {
  phase: GamePhase;
  deck: CardType[];
  hands: Record<PlayerPosition, CardType[]>;
  dealer: PlayerPosition;
  activePlayer: PlayerPosition;
  biddingHistory: Bid[];
  contract: Bid | null;
  declarer: PlayerPosition | null;
  currentTrick: Trick;
  tricksWon: Record<PlayerPosition, number>; // Stored by N/S vs E/W effectively, but tracked per player for simplicity
  message: string;
  isProcessing: boolean;
}