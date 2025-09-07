import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
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
import { usePromptContextManager } from "../hooks/usePromptContextManager";
import {
  extractBibleContext,
  extractSelectiveBibleContext,
  extractStoryContext,
} from "../context-extractor";
import { PromptContextHelpers } from "../hooks/usePromptContextManager";

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
    setBibleEntries,
    activeBibleEntryId,
    activeSidebarTab,
  });

  const [activeAITool, setActiveAITool] = useState(null);
  const [customInstruction, setCustomInstruction] = useState("");
  const [historyCards, setHistoryCards] = useState([]);
  const aiToolsRef = useRef(null);

  // --- Context Management & Token Budgeting ---
  const { preceding, following, selected } = useMemo(
    () => extractStoryContext(activeItem, selection),
    [activeItem, selection]
  );

  const { bibleContext, bibleEntriesForLog } = useMemo(() => {
    const isOutline = activeSidebarTab === "outline";
    const doc = isOutline
      ? documents?.find((d) => d.id === activeDocumentId)
      : null;
    const storyTextForAnalysis = `${preceding?.slice(
      -2000
    )} ${selected} ${following?.slice(0, 1000)}`;

    const result = isOutline
      ? extractSelectiveBibleContext(
          bibleEntries,
          storyTextForAnalysis,
          doc?.title || ""
        )
      : extractBibleContext(bibleEntries, activeBibleEntryId);

    return {
      bibleContext: result.contextString || "",
      bibleEntriesForLog: result.includedEntries || [],
    };
  }, [
    activeSidebarTab,
    documents,
    activeDocumentId,
    preceding,
    selected,
    following,
    bibleEntries,
    activeBibleEntryId,
  ]);

  const variableTokenBudget = useMemo(() => {
    const { textToTokens } = PromptContextHelpers;
    const contextWindowSize = modelContextWindow || 8192;
    const generationTokens = Number(maxTokens) || 1024;
    const promptTokenBudget = contextWindowSize - generationTokens;
    const systemPrompt = `You are a world-class writing partner...`; // This can be a constant
    let fixedTokenCount = 0;
    fixedTokenCount += textToTokens(systemPrompt).length;
    fixedTokenCount += textToTokens(customInstruction).length;
    fixedTokenCount += textToTokens(selected).length;
    fixedTokenCount += 250; // Overhead
    return Math.max(0, promptTokenBudget - fixedTokenCount);
  }, [modelContextWindow, maxTokens, customInstruction, selected]);

  const {
    truncatedBibleContext,
    truncatedPrecedingText,
    truncatedFollowingText,
  } = usePromptContextManager({
    bibleContext,
    precedingText: preceding,
    followingText: following,
    promptTokenBudget: variableTokenBudget,
  });
  // --- End of Context Management ---

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

      const promptOptions = {
        mode,
        instruction,
        activeSidebarTab,
        bible,
        cardContent: "", // for 'continue'
        truncatedBibleContext,
        truncatedPrecedingText,
        truncatedFollowingText,
        selectedText: selected,
        maxTokens,
        generationSettings,
      };

      const { promptForHistory, error: promptError } =
        buildPrompt(promptOptions);

      if (promptError) {
        setError(promptError);
        setIsGenerating(false);
        return;
      }

      console.log(
        "Bible entries included in context:",
        bibleEntriesForLog.map((e) => e.title)
      );

      console.log({
        truncatedBibleContext,
        truncatedPrecedingText,
        truncatedFollowingText,
        selected,
      });

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
      bibleEntriesForLog, // Dependency for logging
      truncatedBibleContext,
      truncatedPrecedingText,
      truncatedFollowingText,
      selected,
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
