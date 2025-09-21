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
import { computeGenerationContext } from "../utils/contextUtils";
import { RefreshCw } from "lucide-react";

const MainContent = ({
  documents,
  setDocuments,
  activeDocumentId,
  bibleEntries,
  activeBibleEntryId,
  updateBibleEntry,
  activeSidebarTab,
  isInitializing,
  isGenerating,
  setIsGenerating,
  setGenerationMessage,
  error,
  setError,
  llmEndpoint,
  apiKey,
  model,
  generationSettings,
  maxTokens,
  modelContextWindow,
  setIsSettingsOpen,
  onRecreateMemory,
}) => {
  const abortControllerRef = useRef(null);
  const {
    editorRef,
    selection,
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
    activeBibleEntryId,
    updateBibleEntry,
    activeSidebarTab,
  });

  const [activeAITool, setActiveAITool] = useState(null);
  const [customInstruction, setCustomInstruction] = useState("");
  const [historyCards, setHistoryCards] = useState([]);
  const aiToolsRef = useRef(null);

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
    }
  };

  const handleCloseCard = (cardId) => {
    setHistoryCards((cards) => cards.filter((card) => card.id !== cardId));
  };

  const handleContinueGeneration = useCallback(
    async (cardToContinue) => {
      if (!llmEndpoint || !model) {
        setError("LLM Endpoint is not configured.");
        setIsSettingsOpen(true);
        return;
      }
      setError("");
      setGenerationMessage("Continuing generation...");
      setIsGenerating(true);

      // Compute fresh context for continuation
      setGenerationMessage("Preparing context...");
      const generationContext = await computeGenerationContext({
        activeItem,
        selection,
        activeSidebarTab,
        documents,
        activeDocumentId,
        bibleEntries,
        activeBibleEntryId,
        customInstruction,
        selectedText,
        modelContextWindow,
        maxTokens,
      });

      const {
        truncatedBibleContext,
        truncatedPrecedingText,
        truncatedFollowingText,
      } = generationContext;

      const updatedOptions = {
        ...cardToContinue.options,
        truncatedBibleContext,
        truncatedPrecedingText,
        truncatedFollowingText,
        selectedText,
        cardContent: cardToContinue.text,
        bibleEntries,
      };

      const { body, error: promptError } = buildPrompt(updatedOptions);
      if (promptError) {
        setError(promptError);
        setIsGenerating(false);
        return;
      }

      setHistoryCards((cards) =>
        cards.map((card) =>
          card.id === cardToContinue.id
            ? { ...card, options: updatedOptions }
            : card
        )
      );

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
          body,
          apiKey,
          llmEndpoint,
          model,
          generationSettings,
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
      model,
      setIsSettingsOpen,
      setError,
      setGenerationMessage,
      setIsGenerating,
      computeGenerationContext,
      selectedText,
      activeItem,
      selection,
      activeSidebarTab,
      documents,
      activeDocumentId,
      bibleEntries,
      activeBibleEntryId,
      customInstruction,
      modelContextWindow,
      maxTokens,
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
      if (!llmEndpoint || !model) {
        setError("LLM Endpoint is not configured.");
        setIsSettingsOpen(true);
        return;
      }
      setError("");
      setGenerationMessage("Rerunning generation...");
      setIsGenerating(true);

      // Compute fresh context for regeneration
      setGenerationMessage("Preparing context...");
      const generationContext = await computeGenerationContext({
        activeItem,
        selection,
        activeSidebarTab,
        documents,
        activeDocumentId,
        bibleEntries,
        activeBibleEntryId,
        customInstruction,
        selectedText,
        modelContextWindow,
        maxTokens,
      });

      const {
        truncatedBibleContext,
        truncatedPrecedingText,
        truncatedFollowingText,
      } = generationContext;

      const updatedOptions = {
        ...cardToRegenerate.options,
        mode: cardToRegenerate.mode,
        instruction: cardToRegenerate.options?.instruction || "",
        activeSidebarTab,
        truncatedBibleContext,
        truncatedPrecedingText,
        truncatedFollowingText,
        selectedText,
        maxTokens,
        generationSettings,
        bibleEntries,
      };

      const { body, error: promptError } = buildPrompt(updatedOptions);

      if (promptError) {
        setError(promptError);
        setIsGenerating(false);
        return;
      }

      setHistoryCards((cards) =>
        cards.map((card) =>
          card.id === cardToRegenerate.id
            ? { ...card, text: "", options: updatedOptions }
            : card
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
          body,
          apiKey,
          llmEndpoint,
          model,
          generationSettings,
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
      model,
      setIsSettingsOpen,
      setError,
      setGenerationMessage,
      setIsGenerating,
      activeSidebarTab,
      computeGenerationContext,
      selectedText,
      maxTokens,
      generationSettings,
      activeItem,
      selection,
      documents,
      activeDocumentId,
      bibleEntries,
      activeBibleEntryId,
      customInstruction,
      modelContextWindow,
    ]
  );

  const generateText = useCallback(
    async (mode, instruction = "") => {
      if (!llmEndpoint || !model) {
        setError("LLM Endpoint is not configured.");
        setIsSettingsOpen(true);
        return;
      }
      setActiveAITool(null);
      setError("");
      setGenerationMessage(`Running "${mode}"...`);
      setIsGenerating(true);

      const bible =
        activeSidebarTab !== "outline"
          ? bibleEntries?.find((b) => b.id === activeBibleEntryId)
          : null;

      // Compute fresh context for generation
      setGenerationMessage("Preparing context...");
      const generationContext = await computeGenerationContext({
        activeItem,
        selection,
        activeSidebarTab,
        documents,
        activeDocumentId,
        bibleEntries,
        activeBibleEntryId,
        customInstruction: instruction,
        selectedText,
        modelContextWindow,
        maxTokens,
      });

      const {
        truncatedBibleContext,
        truncatedPrecedingText,
        truncatedFollowingText,
      } = generationContext;

      const promptOptions = {
        mode,
        instruction,
        activeSidebarTab,
        bible,
        cardContent: "", // for 'continue'
        truncatedBibleContext,
        truncatedPrecedingText,
        truncatedFollowingText,
        selectedText,
        maxTokens,
        generationSettings,
        bibleEntries,
      };

      const {
        body,
        promptForHistory,
        error: promptError,
      } = buildPrompt(promptOptions);

      if (promptError) {
        setError(promptError);
        setIsGenerating(false);
        return;
      }

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
          body,
          apiKey,
          llmEndpoint,
          model,
          generationSettings,
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
      model,
      apiKey,
      activeSidebarTab,
      activeBibleEntryId,
      bibleEntries,
      maxTokens,
      generationSettings,
      setError,
      setIsSettingsOpen,
      setIsGenerating,
      setGenerationMessage,
      selectedText,
      computeGenerationContext,
      activeItem,
      selection,
      documents,
      activeDocumentId,
      customInstruction,
      modelContextWindow,
    ]
  );

  const handleInsertCardText = useCallback(
    (cardText) => {
      const cleanText = (cardText || "")
        .replace(/<think>[\s\S]*?<\/think>/gs, "")
        .trim();
      if (cleanText) {
        handleInsertText(cleanText);
      }
    },
    [handleInsertText]
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
          onClick={handleSelectionChange}
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
        onInsert={handleInsertCardText}
        onContinue={handleContinueGeneration}
        onRegenerate={handleRegenerate}
        onClose={handleCloseCard}
        onStopGeneration={handleStopGeneration}
      />
    </>
  );
};

export default MainContent;
