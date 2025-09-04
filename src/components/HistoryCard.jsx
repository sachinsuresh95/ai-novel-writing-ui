import React from "react";
import { RefreshCwIcon, XIcon, StopIcon } from "./icons";

const HistoryCard = ({
  card,
  onInsert,
  onContinue,
  onRegenerate,
  onClose,
  onStopGeneration,
  isGenerating,
}) => (
  <div className="relative bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4 animate-fade-in group h-[450px] flex flex-col">
    <p className="text-gray-300 text-sm whitespace-pre-wrap flex-grow overflow-y-auto">
      {card.text}
    </p>
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={() => onClose(card.id)}
        className="p-1 text-gray-500 hover:text-red-400"
        title="Close card"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
    <div className="mt-3 flex justify-end items-center space-x-2">
      {isGenerating ? (
        <button
          onClick={onStopGeneration}
          className="p-2 text-xs text-red-400 hover:text-red-300 transition-colors"
          title="Stop generation"
        >
          <StopIcon className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={() => onRegenerate(card)}
          disabled={isGenerating}
          className="p-2 text-xs text-gray-400 hover:text-white transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
          title="Regenerate"
        >
          <RefreshCwIcon className="w-4 h-4" />
        </button>
      )}
      {card.mode !== "brainstorm" && (
        <>
          <button
            onClick={() => onContinue(card)}
            disabled={isGenerating}
            className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md transition-colors disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Continue
          </button>
          <button
            onClick={() => onInsert(card.text)}
            disabled={isGenerating}
            className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-md transition-colors disabled:bg-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Insert
          </button>
        </>
      )}
    </div>
  </div>
);

export default HistoryCard;
