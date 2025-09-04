import React from "react";

const AIPromptPopover = ({
  instruction,
  setInstruction,
  onGenerate,
  onAuto,
  autoLabel = "Auto",
  generateLabel = "Generate",
  placeholder = "Optional: Add specific instructions...",
}) => {
  return (
    <div
      className="absolute top-full mt-2 left-0 z-20 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 animate-fade-in"
      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
    >
      <p className="text-xs text-gray-400 mb-2">
        Guide the AI, or let it run automatically.
      </p>
      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-900 text-white border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
        rows={3}
        autoFocus
      />
      <div className="flex justify-between items-center">
        <button
          onClick={onAuto}
          className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md transition-colors"
        >
          {autoLabel}
        </button>
        <button
          onClick={() => onGenerate(instruction)}
          className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-md transition-colors"
        >
          {generateLabel}
        </button>
      </div>
    </div>
  );
};

export default AIPromptPopover;
