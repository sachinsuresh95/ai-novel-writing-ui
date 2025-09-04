import React from "react";
import HistoryCard from "./HistoryCard";
import { LoaderIcon } from "./icons";

const GenerationPanel = ({
  isGenerating,
  historyCards,
  onInsert,
  onContinue,
  onRegenerate,
  onClose,
  onStopGeneration,
}) => (
  <div className="col-span-1 lg:col-span-3 bg-gray-800/50 rounded-lg border border-gray-700/50 flex flex-col h-full min-h-0">
    <h2 className="font-bold text-white p-4 border-b border-gray-700">
      AI Generations
    </h2>
    <div className="flex-grow p-4 overflow-y-auto min-h-0">
      {isGenerating && historyCards.length === 0 && (
        <div className="flex items-center justify-center space-x-2 text-gray-400">
          <LoaderIcon className="w-5 h-5 animate-spin" />
          <span>Generating...</span>
        </div>
      )}
      {!isGenerating && historyCards.length === 0 && (
        <div className="text-center text-gray-500 text-sm">
          <p>Your AI generations will appear here.</p>
        </div>
      )}
      {historyCards.map((card) => (
        <HistoryCard
          key={card.id}
          card={card}
          onInsert={onInsert}
          onContinue={onContinue}
          onRegenerate={onRegenerate}
          onClose={onClose}
          isGenerating={isGenerating}
          onStopGeneration={onStopGeneration}
        />
      ))}
    </div>
  </div>
);

export default GenerationPanel;
