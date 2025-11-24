import React, { useState, useEffect, useCallback, useRef } from 'react';
import Table from './components/Table';
import BiddingPanel from './components/BiddingPanel';
import { 
  GamePhase, PlayerPosition, GameState, Bid, Trick, CardType, Suit 
} from './types';
import { 
  createDeck, shuffleDeck, sortHand, getNextPlayer, getPartner, 
  determineTrickWinner, isValidCardPlay, getValidBids, formatBid 
} from './utils';
import { getAIBid, getAIPlay } from './services/gemini';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  // --- State Initialization ---
  const [gameState, setGameState] = useState<GameState>({
    phase: GamePhase.Dealing,
    deck: [],
    hands: {
      [PlayerPosition.North]: [],
      [PlayerPosition.East]: [],
      [PlayerPosition.South]: [],
      [PlayerPosition.West]: []
    },
    dealer: PlayerPosition.North,
    activePlayer: PlayerPosition.North,
    biddingHistory: [],
    contract: null,
    declarer: null,
    currentTrick: { cards: [] },
    tricksWon: {
      [PlayerPosition.North]: 0,
      [PlayerPosition.East]: 0,
      [PlayerPosition.South]: 0,
      [PlayerPosition.West]: 0
    },
    message: "Welcome to Gemini Bridge",
    isProcessing: false
  });

  const [aiThinking, setAiThinking] = useState<string | null>(null);

  // --- Game Loop / AI Trigger ---
  const processGameStep = useCallback(async () => {
    if (gameState.isProcessing) return;

    // AI Turn Handling
    const isHumanTurn = gameState.activePlayer === PlayerPosition.South;
    // Special case for playing phase: South plays for North (Dummy) if South is Declarer
    const isDummyTurn = gameState.activePlayer === PlayerPosition.North && gameState.declarer === PlayerPosition.South;
    
    // If it's human turn (or human controlling dummy), do nothing, wait for UI interaction
    if ((isHumanTurn || isDummyTurn) && gameState.phase !== GamePhase.Score) return;

    // --- AI Logic ---
    setGameState(prev => ({ ...prev, isProcessing: true }));
    
    // Simulate AI delay and call Service
    try {
      if (gameState.phase === GamePhase.Bidding) {
         setAiThinking(`AI (${gameState.activePlayer}) is bidding...`);
         const result = await getAIBid(
           gameState.activePlayer, 
           gameState.hands[gameState.activePlayer],
           gameState.biddingHistory,
           gameState.dealer,
           "None" // Simplified Vulnerability
         );
         handleBid(result.bid);
         console.log(`AI Reasoning (${gameState.activePlayer}):`, result.reasoning);
      } 
      else if (gameState.phase === GamePhase.Playing) {
         // Determine if AI is playing as Dummy controlled by AI Declarer (not supported in this simple version, assume standard play)
         // Or AI is playing their own hand.
         
         // Standard AI Play
         setAiThinking(`AI (${gameState.activePlayer}) is thinking...`);
         
         // Dummy hand needed for context
         let dummyHand: CardType[] = [];
         // Find dummy position
         const partners = [PlayerPosition.North, PlayerPosition.South];
         const opponents = [PlayerPosition.East, PlayerPosition.West];
         let dummyPos: PlayerPosition | null = null;
         
         if (partners.includes(gameState.declarer!)) dummyPos = getPartner(gameState.declarer!);
         else dummyPos = getPartner(gameState.declarer!); // Logic actually same: dummy is partner of declarer
         
         if (dummyPos) dummyHand = gameState.hands[dummyPos];
         
         const trumpSuit = gameState.contract?.suit || 'NT';
         
         const result = await getAIPlay(
            gameState.activePlayer,
            gameState.hands[gameState.activePlayer],
            dummyHand,
            gameState.currentTrick,
            gameState.contract!,
            trumpSuit,
            [] // full memory tracking simplified out
         );
         
         const cardToPlay = gameState.hands[gameState.activePlayer][result.cardIndex];
         
         // Validate AI Move - fallback to first valid if invalid
         const hand = gameState.hands[gameState.activePlayer];
         if (!cardToPlay || !isValidCardPlay(cardToPlay, hand, gameState.currentTrick)) {
            // Fallback: Find first valid card
            const validCard = hand.find(c => isValidCardPlay(c, hand, gameState.currentTrick));
            if (validCard) handlePlayCard(validCard);
         } else {
            handlePlayCard(cardToPlay);
         }
         console.log(`AI Play Reasoning (${gameState.activePlayer}):`, result.reasoning);
      }
    } catch (e) {
      console.error("AI Step Failed", e);
    } finally {
      setAiThinking(null);
      setGameState(prev => ({ ...prev, isProcessing: false }));
    }

  }, [gameState]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (!gameState.isProcessing) {
      timeout = setTimeout(() => {
         processGameStep();
      }, 500);
    }
    return () => clearTimeout(timeout);
  }, [gameState.activePlayer, gameState.phase, gameState.isProcessing, processGameStep]);


  // --- Actions ---

  const startNewGame = () => {
    const deck = shuffleDeck(createDeck());
    const hands = {
      [PlayerPosition.North]: sortHand(deck.slice(0, 13)),
      [PlayerPosition.East]: sortHand(deck.slice(13, 26)),
      [PlayerPosition.South]: sortHand(deck.slice(26, 39)),
      [PlayerPosition.West]: sortHand(deck.slice(39, 52)),
    };

    setGameState({
      phase: GamePhase.Bidding,
      deck,
      hands,
      dealer: PlayerPosition.North,
      activePlayer: PlayerPosition.North,
      biddingHistory: [],
      contract: null,
      declarer: null,
      currentTrick: { cards: [] },
      tricksWon: {
        [PlayerPosition.North]: 0,
        [PlayerPosition.East]: 0,
        [PlayerPosition.South]: 0,
        [PlayerPosition.West]: 0
      },
      message: "Bidding Phase Started",
      isProcessing: false
    });
  };

  const handleBid = (bid: Bid) => {
    setGameState(prev => {
      const newHistory = [...prev.biddingHistory, bid];
      
      // Check for 3 passes (end of bidding)
      let consecutivePasses = 0;
      for (let i = newHistory.length - 1; i >= 0; i--) {
        if (newHistory[i].type === 'Pass') consecutivePasses++;
        else break;
      }

      // If everyone passed initially (4 passes)
      if (consecutivePasses === 4 && newHistory.length === 4) {
         // Redeal logic or just reset (Simplified: Restart)
         alert("All passed. Redealing...");
         return prev; // Effect will trigger restart ideally, but simplified here
      }

      let nextPhase = prev.phase;
      let nextContract = prev.contract;
      let nextDeclarer = prev.declarer;
      let nextActive = getNextPlayer(prev.activePlayer);
      let nextMessage = `Bid: ${formatBid(bid)}`;

      // Bidding Ended?
      if (consecutivePasses >= 3 && newHistory.length > 3) {
        // Find last actual bid
        const lastBidIndex = newHistory.map(b => b.type).lastIndexOf('Bid');
        if (lastBidIndex !== -1) {
           const winningBid = newHistory[lastBidIndex];
           nextContract = winningBid;
           nextPhase = GamePhase.Playing;
           
           // Determine Declarer: First player of the partnership who bid the suit
           const winner = winningBid.player;
           const partner = getPartner(winner);
           const suit = winningBid.suit;
           
           // Find first bid of this suit by winner or partner
           const firstBid = newHistory.find(b => 
             b.type === 'Bid' && b.suit === suit && (b.player === winner || b.player === partner)
           );
           nextDeclarer = firstBid ? firstBid.player : winner;
           
           // Leader is left of declarer
           nextActive = getNextPlayer(nextDeclarer);
           nextMessage = `Contract: ${formatBid(winningBid)} by ${nextDeclarer}. ${nextActive} to lead.`;
        }
      }

      return {
        ...prev,
        biddingHistory: newHistory,
        phase: nextPhase,
        activePlayer: nextActive,
        contract: nextContract,
        declarer: nextDeclarer,
        message: nextMessage
      };
    });
  };

  const handlePlayCard = (card: CardType) => {
    setGameState(prev => {
      // Remove card from hand
      const newHand = prev.hands[prev.activePlayer].filter(c => c.id !== card.id);
      
      // Update trick
      const newTrickCards = [...prev.currentTrick.cards, { player: prev.activePlayer, card }];
      const newTrick: Trick = {
        cards: newTrickCards,
        leadSuit: prev.currentTrick.leadSuit || card.suit
      };

      let nextActive = getNextPlayer(prev.activePlayer);
      let trickComplete = false;
      let trickWinner: PlayerPosition | null = null;
      let newTricksWon = { ...prev.tricksWon };
      let finalTrick = newTrick; // For state update

      // Trick complete?
      if (newTrickCards.length === 4) {
        trickComplete = true;
        trickWinner = determineTrickWinner(newTrick, prev.contract?.suit);
        newTricksWon[trickWinner]++;
        
        // Winner leads next
        nextActive = trickWinner; 
      }

      // Check for Game End
      const totalTricks = Object.values(newTricksWon).reduce((a: number, b: number) => a + b, 0);
      let nextPhase = prev.phase;
      
      if (trickComplete) {
         // We normally pause here to show the trick, then clear.
         // For React state simplicity, we set a timeout-based clearer outside or handle strictly here.
         // We will clear the trick in the NEXT render cycle or via effect if we want animation.
         // Simplified: We keep the trick visible for a moment? 
         // Implementation: We'll set a state "TrickJustFinished" and use useEffect to clear it after delay.
         // But for single state update: we set the trick, and next player logic.
         // *However*, to animate, we usually need a pause.
         // We will handle clearing in a separate step if we want good UX.
         // For now, let's auto-clear in next update cycle logic or simple timeout.
      }

      if (totalTricks === 13 && trickComplete) {
        nextPhase = GamePhase.Score;
      }

      return {
        ...prev,
        hands: { ...prev.hands, [prev.activePlayer]: newHand },
        currentTrick: finalTrick, // Ideally, if trick complete, we wait before clearing
        activePlayer: trickComplete ? trickWinner! : nextActive,
        tricksWon: newTricksWon,
        phase: nextPhase
      };
    });
  };

  // Effect to clear trick after delay if full
  useEffect(() => {
    if (gameState.currentTrick.cards.length === 4) {
      setGameState(prev => ({ ...prev, isProcessing: true })); // Block interaction
      const timer = setTimeout(() => {
         setGameState(prev => ({
           ...prev,
           currentTrick: { cards: [] },
           isProcessing: false
         }));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentTrick.cards.length]);

  // --- Initial Start ---
  useEffect(() => {
    startNewGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-screen w-full bg-gray-900 overflow-hidden flex flex-col">
      {/* HUD / Status Bar */}
      <div className="z-10 bg-gray-800 text-white p-2 flex justify-between items-center shadow-md">
        <h1 className="font-serif font-bold text-xl tracking-wider text-yellow-500">Gemini Bridge</h1>
        <div className="flex items-center gap-4 text-sm">
          {aiThinking && (
             <div className="flex items-center text-blue-300 gap-2 animate-pulse">
               <Loader2 className="w-4 h-4 animate-spin" />
               {aiThinking}
             </div>
          )}
          <div className="px-3 py-1 bg-gray-700 rounded-full border border-gray-600">
             {gameState.phase === GamePhase.Score 
                ? "Game Over" 
                : `${gameState.activePlayer}'s Turn`}
          </div>
          <button 
             onClick={startNewGame}
             className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-xs font-bold uppercase"
          >
            New Deal
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-grow relative">
        <Table 
          hands={gameState.hands}
          currentTrick={gameState.currentTrick}
          activePlayer={gameState.activePlayer}
          declarer={gameState.declarer}
          dummy={getPartner(gameState.declarer || PlayerPosition.North)}
          onPlayCard={handlePlayCard}
          phase={gameState.phase}
          playerPos={PlayerPosition.South}
          contract={gameState.contract}
          biddingHistory={gameState.biddingHistory}
          dealer={gameState.dealer}
        />

        {/* Bidding Overlay */}
        {gameState.phase === GamePhase.Bidding && (
          <BiddingPanel 
            history={gameState.biddingHistory}
            onBid={handleBid}
            validBids={getValidBids(gameState.biddingHistory)}
            isMyTurn={gameState.activePlayer === PlayerPosition.South}
          />
        )}
        
        {/* Game Over Modal */}
        {gameState.phase === GamePhase.Score && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
             <div className="bg-white text-gray-900 p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
                <h2 className="text-3xl font-serif mb-4 text-green-800">Hand Complete</h2>
                <div className="flex justify-between mb-6 text-xl">
                   <div className="flex flex-col">
                      <span className="text-sm text-gray-500 uppercase">N/S Tricks</span>
                      <span className="font-bold">{gameState.tricksWon.North + gameState.tricksWon.South}</span>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-sm text-gray-500 uppercase">Contract</span>
                      <span className="font-bold text-blue-600">{gameState.contract ? formatBid(gameState.contract) : '-'}</span>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-sm text-gray-500 uppercase">E/W Tricks</span>
                      <span className="font-bold">{gameState.tricksWon.East + gameState.tricksWon.West}</span>
                   </div>
                </div>
                <button 
                  onClick={startNewGame}
                  className="w-full py-3 bg-green-700 text-white rounded-lg font-bold hover:bg-green-800 transition shadow-lg"
                >
                  Deal Next Hand
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;