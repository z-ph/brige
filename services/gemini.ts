import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Bid, CardType, PlayerPosition, Trick, Suit, Rank, GamePhase } from '../types';
import { formatBid } from '../utils';

// Initialize Gemini
// NOTE: Assuming process.env.API_KEY is available as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
const MODEL_NAME = 'gemini-2.5-flash';

const BID_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: ['Bid', 'Pass', 'Double', 'Redouble'] },
    level: { type: Type.INTEGER, description: "1-7 if type is Bid" },
    suit: { type: Type.STRING, enum: ['C', 'D', 'H', 'S', 'NT'], description: "Required if type is Bid" },
    reasoning: { type: Type.STRING, description: "Short explanation of the bid" }
  },
  required: ['type', 'reasoning']
};

const PLAY_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    cardIndex: { type: Type.INTEGER, description: "The zero-based index of the card in the provided hand array to play." },
    reasoning: { type: Type.STRING, description: "Why this card was chosen." }
  },
  required: ['cardIndex', 'reasoning']
};

export const getAIBid = async (
  player: PlayerPosition,
  hand: CardType[],
  history: Bid[],
  dealer: PlayerPosition,
  vulnerability: string
): Promise<{ bid: Bid, reasoning: string }> => {
  
  const handStr = hand.map(c => `${c.rank}${c.suit}`).join(', ');
  const historyStr = history.map(b => formatBid(b)).join(', ');
  
  const prompt = `
    You are an expert Bridge player sitting ${player}.
    Your Hand: [${handStr}]
    Dealer: ${dealer}
    Vulnerability: ${vulnerability}
    Bidding History: [${historyStr}]
    
    Determine the best bid based on Standard American Yellow Card (SAYC) conventions.
    Return the bid in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: BID_SCHEMA,
        temperature: 0.2 // Lower temperature for more consistent logic
      }
    });

    const json = JSON.parse(response.text || '{}');
    
    // Map simplified schema suit to Enum
    let suitEnum: any = undefined;
    if (json.suit === 'C') suitEnum = Suit.Clubs;
    if (json.suit === 'D') suitEnum = Suit.Diamonds;
    if (json.suit === 'H') suitEnum = Suit.Hearts;
    if (json.suit === 'S') suitEnum = Suit.Spades;
    if (json.suit === 'NT') suitEnum = 'NT';

    return {
      bid: {
        type: json.type,
        level: json.level,
        suit: suitEnum,
        player: player
      },
      reasoning: json.reasoning
    };
  } catch (error) {
    console.error("Gemini Bid Error", error);
    return { bid: { type: 'Pass', player }, reasoning: "Error fallback" };
  }
};

export const getAIPlay = async (
  player: PlayerPosition,
  hand: CardType[],
  dummyHand: CardType[],
  trick: Trick,
  contract: Bid,
  trumpSuit: Suit | 'NT',
  playedCards: CardType[] // Simplified memory
): Promise<{ cardIndex: number, reasoning: string }> => {
  
  const handStr = hand.map((c, i) => `(${i}):${c.rank}${c.suit}`).join(', ');
  const dummyStr = dummyHand.map(c => `${c.rank}${c.suit}`).join(', ');
  const trickStr = trick.cards.map(c => `${c.player}:${c.card.rank}${c.card.suit}`).join(', ');
  
  const prompt = `
    You are an expert Bridge player sitting ${player}.
    Contract: ${formatBid(contract)}
    Trump: ${trumpSuit}
    
    Your Hand (indices): [${handStr}]
    Dummy Hand: [${dummyStr}]
    Current Trick: [${trickStr}]
    Lead Suit: ${trick.leadSuit || 'None (You lead)'}
    
    Choose the best card to play to win the trick or signal partner, following standard bridge logic (count points, finessing, etc).
    You MUST follow suit if possible.
    
    Return the index of the card in your hand to play.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: PLAY_SCHEMA,
        temperature: 0.1
      }
    });

    const json = JSON.parse(response.text || '{}');
    return {
      cardIndex: json.cardIndex,
      reasoning: json.reasoning
    };
  } catch (error) {
    console.error("Gemini Play Error", error);
    return { cardIndex: 0, reasoning: "Error fallback" };
  }
};
