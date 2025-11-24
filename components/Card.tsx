import React from 'react';
import { CardType, Suit } from '../types';
import { getSuitSymbol } from '../utils';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  className?: string;
  playable?: boolean;
  faceDown?: boolean;
}

const Card: React.FC<CardProps> = ({ card, onClick, className = '', playable = false, faceDown = false }) => {
  const isRed = card.suit === Suit.Hearts || card.suit === Suit.Diamonds;
  
  if (faceDown) {
     return (
      <div 
        className={`relative w-20 h-28 sm:w-24 sm:h-36 bg-blue-800 rounded-lg border-2 border-white card-shadow flex items-center justify-center overflow-hidden ${className}`}
      >
        <div className="bg-blue-900 w-full h-full opacity-50 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-blue-500 to-blue-900"></div>
        <div className="absolute text-white font-serif text-2xl font-bold opacity-20">GEMINI</div>
      </div>
    );
  }

  return (
    <div 
      onClick={playable ? onClick : undefined}
      className={`
        relative w-20 h-28 sm:w-24 sm:h-36 bg-white rounded-lg shadow-md select-none transition-transform duration-200
        ${playable ? 'cursor-pointer hover:-translate-y-4 hover:shadow-xl' : ''}
        ${isRed ? 'text-red-600' : 'text-gray-900'}
        ${className}
      `}
    >
      {/* Top Left Corner */}
      <div className="absolute top-1 left-1 flex flex-col items-center leading-none">
        <span className="text-lg font-bold font-serif">{card.rank}</span>
        <span className="text-xl">{getSuitSymbol(card.suit)}</span>
      </div>

      {/* Center Big Suit */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-5xl opacity-90">{getSuitSymbol(card.suit)}</span>
      </div>

      {/* Bottom Right Corner (Rotated) */}
      <div className="absolute bottom-1 right-1 flex flex-col items-center leading-none transform rotate-180">
        <span className="text-lg font-bold font-serif">{card.rank}</span>
        <span className="text-xl">{getSuitSymbol(card.suit)}</span>
      </div>
    </div>
  );
};

export default Card;