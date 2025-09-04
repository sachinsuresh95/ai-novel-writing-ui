import React from "react";

const Editor = ({
  editorRef,
  editorKey,
  content,
  onChange,
  onSelectionChange,
  isEditorActive,
  isGeneratingOrProtected,
  isInitializing,
  activeItem,
}) => (
  <>
    <textarea
      ref={editorRef}
      key={editorKey}
      value={content}
      onChange={onChange}
      onSelect={onSelectionChange}
      onMouseUp={onSelectionChange}
      onKeyUp={onSelectionChange}
      className="w-full h-full flex-grow bg-gray-800 text-gray-200 p-6 rounded-b-lg border-t-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed text-lg"
      placeholder={
        isEditorActive
          ? "Your story continues..."
          : "Select or create an item to begin."
      }
      disabled={!isEditorActive || isGeneratingOrProtected || isInitializing}
    />
    {activeItem?.type === "Instructions" && (
      <div className="mt-2 text-xs text-gray-400 bg-gray-800 p-3 rounded-md border border-gray-700">
        <p className="font-semibold text-gray-300 mb-1">Instructions Entry</p>
        <p>
          Content here provides general guidance to the AI when generating text
          for your outline. The 'Brainstorm' feature is disabled for this entry
          type.
        </p>
      </div>
    )}
    {activeItem?.type === "Memory" && (
      <div className="mt-2 text-xs text-gray-400 bg-gray-800 p-3 rounded-md border border-gray-700">
        <p className="font-semibold text-gray-300 mb-1">Memory Entry</p>
        <p>
          This entry is automatically generated and updated by the AI to
          summarize your chapters. It serves as the AI's long-term memory.
          Manual edits are not recommended.
        </p>
      </div>
    )}
  </>
);

export default Editor;
