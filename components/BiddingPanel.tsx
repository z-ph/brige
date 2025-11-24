import React from 'react';
import { Bid, PlayerPosition, Suit } from '../types';
import { formatBid } from '../utils';

interface BiddingPanelProps {
  history: Bid[];
  onBid: (bid: Bid) => void;
  validBids: Bid[];
  isMyTurn: boolean;
}

const BiddingPanel: React.FC<BiddingPanelProps> = ({ history, onBid, validBids, isMyTurn }) => {
  
  // Helper to check if a specific bid is valid
  const isBidValid = (level: number, suit: Suit | 'NT') => {
    return validBids.some(b => b.type === 'Bid' && b.level === level && b.suit === suit);
  };

  const levels = [1, 2, 3, 4, 5, 6, 7];
  const suits: (Suit | 'NT')[] = [Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades, 'NT'];

  if (!isMyTurn) return null;

  return (
    <div className="absolute bottom-32 sm:bottom-40 left-1/2 transform -translate-x-1/2 z-20 bg-white/95 p-4 rounded-xl shadow-2xl border border-gray-200 max-w-lg w-full">
      <h3 className="text-center font-bold text-gray-800 mb-2 font-serif">Make a Bid</h3>
      
      <div className="grid grid-rows-7 gap-1 mb-4">
        {levels.map(level => (
          <div key={level} className="flex gap-2 justify-center">
             <span className="w-6 font-bold text-gray-500 self-center">{level}</span>
             {suits.map(suit => {
               const valid = isBidValid(level, suit);
               let symbol = suit === 'NT' ? 'NT' : suit === Suit.Clubs ? '♣' : suit === Suit.Diamonds ? '♦' : suit === Suit.Hearts ? '♥' : '♠';
               let colorClass = (suit === Suit.Hearts || suit === Suit.Diamonds) ? 'text-red-600' : 'text-gray-900';
               if (suit === 'NT') colorClass = 'text-gray-900';

               return (
                 <button
                    key={`${level}${suit}`}
                    disabled={!valid}
                    onClick={() => onBid({ type: 'Bid', level, suit, player: PlayerPosition.South })}
                    className={`
                      w-10 h-8 sm:w-12 sm:h-10 rounded shadow-sm border flex items-center justify-center font-bold
                      ${valid 
                        ? 'bg-white hover:bg-blue-50 border-gray-300 cursor-pointer active:scale-95' 
                        : 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'}
                      ${colorClass}
                    `}
                 >
                   {symbol}
                 </button>
               );
             })}
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-4 border-t pt-2">
         <button 
           onClick={() => onBid({ type: 'Pass', player: PlayerPosition.South })}
           className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 transition"
         >
           PASS
         </button>
         {/* Double/Redouble placeholder logic */}
         <button disabled className="px-6 py-2 bg-gray-300 text-gray-500 rounded font-bold cursor-not-allowed">X</button>
         <button disabled className="px-6 py-2 bg-gray-300 text-gray-500 rounded font-bold cursor-not-allowed">XX</button>
      </div>
    </div>
  );
};

export default BiddingPanel;