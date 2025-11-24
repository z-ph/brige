import React, { useMemo } from 'react';
import Card from './Card';
import { CardType, PlayerPosition, Trick, GamePhase, Bid } from '../types';
import { getSuitSymbol, formatBid } from '../utils';

interface TableProps {
  hands: Record<PlayerPosition, CardType[]>;
  currentTrick: Trick;
  activePlayer: PlayerPosition;
  declarer: PlayerPosition | null;
  dummy: PlayerPosition | null;
  onPlayCard: (card: CardType) => void;
  phase: GamePhase;
  playerPos: PlayerPosition; // The human player (South)
  contract: Bid | null;
  biddingHistory: Bid[];
  dealer: PlayerPosition;
}

const Table: React.FC<TableProps> = ({
  hands,
  currentTrick,
  activePlayer,
  declarer,
  dummy,
  onPlayCard,
  phase,
  playerPos,
  contract,
  biddingHistory,
  dealer
}) => {

  const renderHand = (position: PlayerPosition) => {
    const hand = hands[position];
    const isMe = position === playerPos;
    // Dummy is visible to everyone during play
    const isDummy = position === dummy && phase === GamePhase.Playing;
    // Show face up if it's me, or if it's dummy and we are playing
    const showFaceUp = isMe || isDummy;
    
    // Playability:
    // 1. It's my turn AND it's my hand
    // 2. OR I am Declarer, it's Dummy's turn, and I control Dummy
    let isPlayable = false;
    if (phase === GamePhase.Playing) {
       if (isMe && activePlayer === position) isPlayable = true;
       if (isDummy && activePlayer === position && declarer === playerPos) isPlayable = true;
    }

    // Layout positioning
    let containerClass = "";
    let cardWrapperClass = "";
    
    switch (position) {
      case PlayerPosition.North:
        containerClass = "absolute top-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center";
        cardWrapperClass = "flex -space-x-8 sm:-space-x-10";
        break;
      case PlayerPosition.South:
        containerClass = "absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center";
        cardWrapperClass = "flex -space-x-8 sm:-space-x-10";
        break;
      case PlayerPosition.West:
        containerClass = "absolute left-4 top-1/2 transform -translate-y-1/2 flex flex-row items-center";
        cardWrapperClass = "flex flex-col -space-y-12 sm:-space-y-16";
        break;
      case PlayerPosition.East:
        containerClass = "absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-row items-center";
        cardWrapperClass = "flex flex-col -space-y-12 sm:-space-y-16";
        break;
    }

    return (
      <div className={containerClass}>
        <div className={`
          mb-2 px-3 py-1 rounded-full text-sm font-bold shadow-md bg-black/40 text-white backdrop-blur-sm flex items-center gap-2
          ${activePlayer === position ? 'ring-2 ring-yellow-400 text-yellow-100' : 'opacity-70'}
        `}>
           {position === dealer ? <span className="text-yellow-400 text-xs border border-yellow-400 rounded px-1">D</span> : null}
           {position} 
           {position === declarer ? ' (Decl)' : ''}
           {position === dummy ? ' (Dummy)' : ''}
        </div>
        
        <div className={cardWrapperClass}>
          {hand.map((card, idx) => (
            <div key={card.id} style={{ zIndex: idx }} className="transition-all hover:z-50">
              <Card 
                card={card} 
                faceDown={!showFaceUp} 
                playable={showFaceUp && isPlayable}
                onClick={() => isPlayable && onPlayCard(card)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCenterArea = () => {
    if (phase === GamePhase.Bidding) {
      return (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-900/80 p-6 rounded-xl shadow-xl backdrop-blur-sm border border-green-700 min-w-[300px]">
          <h2 className="text-xl font-serif text-yellow-100 mb-4 text-center border-b border-green-600 pb-2">Bidding Table</h2>
          <div className="grid grid-cols-4 gap-2 text-center text-white mb-2 font-bold text-sm">
            <div>West</div>
            <div>North</div>
            <div>East</div>
            <div>South</div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            {/* Pad checks based on dealer to align first bid */}
            {Array.from({length: ['West', 'North', 'East', 'South'].indexOf(dealer)}).map((_, i) => (
                <div key={`pad-${i}`}></div>
            ))}
            {biddingHistory.map((bid, i) => (
              <div key={i} className="bg-white/10 rounded py-1 px-2 border border-white/5">
                {formatBid(bid)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (phase === GamePhase.Playing) {
      return (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
            {/* Render played cards in cardinal positions relative to center */}
            {currentTrick.cards.map((play, i) => {
               let translate = "";
               switch(play.player) {
                 case PlayerPosition.North: translate = "translate-y-[-40px]"; break;
                 case PlayerPosition.South: translate = "translate-y-[40px]"; break;
                 case PlayerPosition.West: translate = "translate-x-[-40px]"; break;
                 case PlayerPosition.East: translate = "translate-x-[40px]"; break;
               }
               
               return (
                 <div key={play.card.id} className={`absolute transform ${translate} transition-all duration-300`}>
                   <Card card={play.card} className="shadow-2xl" />
                 </div>
               );
            })}
        </div>
      );
    }
    
    return null;
  };

  const renderInfoBoard = () => {
    return (
      <div className="absolute top-4 right-4 bg-black/60 text-white p-3 rounded-lg backdrop-blur text-sm border border-white/10 shadow-lg">
         <div className="mb-2 font-bold text-yellow-400 border-b border-white/20 pb-1">Contract</div>
         <div className="text-xl font-serif text-center mb-3">
            {contract ? formatBid(contract) : '---'}
            {declarer ? <span className="text-xs text-gray-400 block">by {declarer}</span> : null}
         </div>
         {/* Simple trick counter visualization */}
         <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
           <span className="text-blue-300">Target</span>
           <span className="text-right">{contract && contract.level ? 6 + contract.level : '-'}</span>
         </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-screen overflow-hidden felt-texture select-none">
      {renderInfoBoard()}
      
      {renderHand(PlayerPosition.North)}
      {renderHand(PlayerPosition.West)}
      {renderHand(PlayerPosition.East)}
      {renderHand(PlayerPosition.South)}
      
      {renderCenterArea()}
    </div>
  );
};

export default Table;