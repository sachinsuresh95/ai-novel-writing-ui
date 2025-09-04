import React, { useState, useRef, useCallback, useEffect } from "react";
import AIToolbar from "./AIToolbar";
import Editor from "./Editor";
import GenerationPanel from "./GenerationPanel";
import { useEditor } from "../hooks/useEditor";
import {
  generateText as generateTextAPI,
  continueGeneration as continueGenerationAPI,
  regenerate as regenerateAPI,
} from "../services/AIGeneration";
import { buildPrompt } from "../prompt-builder";
import { RefreshCw } from "lucide-react";

const MainContent = ({
  documents,
  setDocuments,
  activeDocumentId,
  bibleEntries,
  setBibleEntries,
  activeBibleEntryId,
  activeSidebarTab,
  isInitializing,
  isGenerating,
  setIsGenerating,
  generationMessage,
  setGenerationMessage,
  error,
  setError,
  llmEndpoint,
  apiKey,
  generationPreset,
  maxTokens,
  setIsSettingsOpen,
  onRecreateMemory,
}) => {
  const abortControllerRef = useRef(null);
  const {
    editorRef,
    selectionRef,
    selectedText,
    handleSelectionChange,
    handleInsertText,
    handleManuscriptChange,
    activeItem,
    editorContent,
    editorKey,
    isEditorActive,
  } = useEditor({
    documents,
    setDocuments,
    activeDocumentId,
    bibleEntries,
    setBibleEntries,
    activeBibleEntryId,
    activeSidebarTab,
  });

  const [activeAITool, setActiveAITool] = useState(null);
  const [customInstruction, setCustomInstruction] = useState("");
  const [historyCards, setHistoryCards] = useState([]);
  const aiToolsRef = useRef(null);

  // Effect to handle clicks outside of AI tools popover
  useEffect(() => {
    function handleClickOutside(event) {
      if (aiToolsRef.current && !aiToolsRef.current.contains(event.target)) {
        setActiveAITool(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [aiToolsRef]);

  const handleAIToolClick = (tool) => {
    if (activeAITool === tool) {
      setActiveAITool(null);
    } else {
      setActiveAITool(tool);
      // setCustomInstruction("");
    }
  };

  const handleCloseCard = (cardId) => {
    setHistoryCards((cards) => cards.filter((card) => card.id !== cardId));
  };

  const handleContinueGeneration = useCallback(
    async (cardToContinue) => {
      if (!llmEndpoint) {
        setError("LLM Endpoint is not configured.");
        setIsSettingsOpen(true);
        return;
      }
      setError("");
      setGenerationMessage("Continuing generation...");
      setIsGenerating(true);

      // Store the existing text before continuing
      const existingText = cardToContinue.text;

      try {
        abortControllerRef.current = new AbortController();
        const onData = (chunk) => {
          setHistoryCards((cards) =>
            cards.map((card) =>
              card.id === cardToContinue.id
                ? { ...card, text: card.text + chunk }
                : card
            )
          );
        };

        await continueGenerationAPI(
          cardToContinue,
          apiKey,
          llmEndpoint,
          onData,
          abortControllerRef.current.signal
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setIsGenerating(false);
      }
    },
    [
      llmEndpoint,
      apiKey,
      setIsSettingsOpen,
      setError,
      setGenerationMessage,
      setIsGenerating,
    ]
  );

  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  }, [setIsGenerating]);

  const handleRegenerate = useCallback(
    async (cardToRegenerate) => {
      if (!llmEndpoint) {
        setError("LLM Endpoint is not configured.");
        setIsSettingsOpen(true);
        return;
      }
      setError("");
      setGenerationMessage("Rerunning generation...");
      setIsGenerating(true);

      // Clear the card's text before starting regeneration
      setHistoryCards((cards) =>
        cards.map((card) =>
          card.id === cardToRegenerate.id ? { ...card, text: "" } : card
        )
      );

      try {
        abortControllerRef.current = new AbortController();
        const onData = (chunk) => {
          setHistoryCards((cards) =>
            cards.map((card) =>
              card.id === cardToRegenerate.id
                ? { ...card, text: card.text + chunk }
                : card
            )
          );
        };

        await regenerateAPI(
          cardToRegenerate,
          apiKey,
          llmEndpoint,
          onData,
          abortControllerRef.current.signal
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setIsGenerating(false);
      }
    },
    [
      llmEndpoint,
      apiKey,
      setIsSettingsOpen,
      setError,
      setGenerationMessage,
      setIsGenerating,
    ]
  );

  const generateText = useCallback(
    async (mode, instruction = "") => {
      if (!llmEndpoint) {
        setError("LLM Endpoint is not configured.");
        setIsSettingsOpen(true);
        return;
      }
      setActiveAITool(null);
      setError("");
      setGenerationMessage(`Running "${mode}"...`);
      setIsGenerating(true);

      const promptOptions = {
        mode,
        instruction,
        activeSidebarTab,
        documents,
        activeDocumentId,
        bibleEntries,
        activeBibleEntryId,
        selectionRef,
        generationPreset,
        maxTokens,
      };

      const { promptForHistory, error: promptError } =
        buildPrompt(promptOptions);

      if (promptError) {
        setError(promptError);
        setIsGenerating(false);
        return;
      }

      // Create card immediately with empty text
      const newCardId = Date.now();
      setHistoryCards((prev) => [
        {
          id: newCardId,
          text: "",
          mode,
          prompt: promptForHistory,
          options: promptOptions,
        },
        ...prev,
      ]);

      try {
        abortControllerRef.current = new AbortController();
        const onData = (chunk) => {
          setHistoryCards((prev) =>
            prev.map((card) =>
              card.id === newCardId
                ? { ...card, text: card.text + chunk }
                : card
            )
          );
        };

        await generateTextAPI(
          promptOptions,
          apiKey,
          llmEndpoint,
          onData,
          abortControllerRef.current.signal
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setIsGenerating(false);
      }
    },
    [
      llmEndpoint,
      apiKey,
      activeDocumentId,
      activeBibleEntryId,
      activeSidebarTab,
      documents,
      bibleEntries,
      maxTokens,
      generationPreset,
      setIsSettingsOpen,
      setError,
      setGenerationMessage,
      setIsGenerating,
    ]
  );

  const isGeneratingOrProtected = isGenerating || activeItem?.type === "Memory";

  const canRewrite =
    (activeSidebarTab === "outline" && !!selectedText) ||
    (activeSidebarTab === "bible" &&
      isEditorActive &&
      !isGeneratingOrProtected);

  const isMemoryView = activeItem?.type === "Memory";

  return (
    <>
      <div
        ref={aiToolsRef}
        className="col-span-1 lg:col-span-7 flex flex-col h-full"
      >
        <AIToolbar
          activeAITool={activeAITool}
          handleAIToolClick={handleAIToolClick}
          customInstruction={customInstruction}
          setCustomInstruction={setCustomInstruction}
          generateText={generateText}
          isEditorActive={isEditorActive}
          isGeneratingOrProtected={isGeneratingOrProtected}
          canRewrite={canRewrite}
          selectedText={selectedText}
          activeSidebarTab={activeSidebarTab}
        />
        {isMemoryView && (
          <div className="p-2 border-b border-gray-700 flex items-center">
            <button
              onClick={onRecreateMemory}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-white bg-gray-700 rounded-md hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`}
              />
              <span>Recreate Memory</span>
            </button>
          </div>
        )}
        <Editor
          editorRef={editorRef}
          editorKey={editorKey}
          content={editorContent}
          onChange={handleManuscriptChange}
          onSelectionChange={handleSelectionChange}
          isEditorActive={isEditorActive}
          isGeneratingOrProtected={isGeneratingOrProtected}
          isInitializing={isInitializing}
          activeItem={activeItem}
        />
        {error && (
          <div className="mt-2 text-sm text-red-400 bg-red-900/50 p-3 rounded-md">
            {error}
          </div>
        )}
      </div>

      <GenerationPanel
        isGenerating={isGenerating}
        historyCards={historyCards}
        onInsert={handleInsertText}
        onContinue={handleContinueGeneration}
        onRegenerate={handleRegenerate}
        onClose={handleCloseCard}
        onStopGeneration={handleStopGeneration}
      />
    </>
  );
};

export default MainContent;
