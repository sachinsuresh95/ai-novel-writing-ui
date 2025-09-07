import React, { useState, useEffect, useCallback, useRef } from "react";
import SettingsModal from "./components/SettingsModal";
import Sidebar from "./components/Sidebar";
import NewBibleEntryModal from "./components/NewBibleEntryModal";
import * as storage from "./storage";
import usePrevious from "./hooks/usePrevious";
import useDebouncedEffect from "./hooks/useDebouncedEffect";
import { useSettings } from "./hooks/useSettings";
import { useProjectManager } from "./hooks/useProjectManager";
import { useProjectData } from "./hooks/useProjectData";
import {
  generateInitialMemory,
  updateMemory as updateMemoryAPI,
} from "./services/AIGeneration";
import Header from "./components/layout/Header";
import MainContent from "./components/MainContent";

const App = () => {
  const {
    baseUrl,
    llmEndpoint,
    apiKey,
    model,
    modelContextWindow,
    maxTokens,
    generationSettings,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsError,
    credsValidated,
    handleSaveSettings,
  } = useSettings();

  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    handleNewProject,
    handleSwitchProject,
    handleExportProject,
    handleImportProject,
    handleDeleteProject,
    handleRenameProject,
  } = useProjectManager();

  const generateInitialMemoryCallback = useCallback(
    (docs) => {
      return generateInitialMemory(
        docs,
        apiKey,
        llmEndpoint,
        model,
        modelContextWindow
      );
    },
    [apiKey, llmEndpoint, model, modelContextWindow]
  );

  const {
    documents,
    setDocuments,
    activeDocumentId,
    setActiveDocumentId,
    bibleEntries,
    setBibleEntries,
    activeBibleEntryId,
    setActiveBibleEntryId,
    isInitializing,
    initMessage,
    error,
    setError,
    loadProjectData,
  } = useProjectData(activeProjectId, generateInitialMemoryCallback);

  // UI state
  const [activeSidebarTab, setActiveSidebarTab] = useState("outline");
  const [isNewBibleEntryModalOpen, setIsNewBibleEntryModalOpen] =
    useState(false);

  // AI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] =
    useState("AI is thinking...");

  const prevDocuments = usePrevious(documents);
  const memoryUpdateAbortController = useRef(null);

  useEffect(() => {
    if (!credsValidated) {
      setIsSettingsOpen(true);
    }
  }, [credsValidated, setIsSettingsOpen]);

  // Load project data when active project changes AND credentials are valid
  useEffect(() => {
    if (activeProjectId && credsValidated) {
      loadProjectData(activeProjectId);
    }
  }, [activeProjectId, credsValidated, loadProjectData]);

  // Debounced effect to save the current project's data
  useDebouncedEffect(
    () => {
      if (isInitializing || !activeProjectId) return;

      const activeProject = projects.find((p) => p.id === activeProjectId);
      if (!activeProject) return;

      const projectData = {
        id: activeProjectId,
        name: activeProject.name,
        documents,
        bibleEntries,
        activeDocumentId,
        activeBibleEntryId,
      };

      storage.saveProject(projectData).catch((err) => {
        console.error("Failed to save project data:", err);
        setError("Failed to save project data.");
      });
    },
    [
      documents,
      bibleEntries,
      activeDocumentId,
      activeBibleEntryId,
      projects,
      activeProjectId,
      isInitializing,
    ],
    1000
  );

  // Effect to automatically summarize document changes into the memory
  const updateMemory = useCallback(
    async (docToSummarize, signal) => {
      const summary = await updateMemoryAPI(
        docToSummarize,
        apiKey,
        llmEndpoint,
        model,
        modelContextWindow,
        signal
      );
      if (summary) {
        setBibleEntries((currentBibleEntries) => {
          const memoryEntry = currentBibleEntries.find(
            (e) => e.type === "Memory"
          );
          if (!memoryEntry) return currentBibleEntries;

          let newMemoryContent = memoryEntry.content;
          // Escape regex special characters in the title
          const escapedTitle = docToSummarize.title.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

          const chapterStartTag = `<${docToSummarize.title}>`;
          const chapterEndTag = `</${docToSummarize.title}>`;

          // Regex: match <title> ... </title>, allowing optional newlines/spaces inside
          const chapterRegex = new RegExp(
            `<${escapedTitle}>\\s*([\\s\\S]*?)\\s*<\\/${escapedTitle}>`
          );

          const newChapterSection = `${chapterStartTag}\n${summary}\n${chapterEndTag}`;

          // Step 1: Replace the *first occurrence*
          let replacedOnce = false;
          newMemoryContent = newMemoryContent.replace(chapterRegex, (match) => {
            if (!replacedOnce) {
              replacedOnce = true;
              return newChapterSection; // keep the first
            }
            return ""; // delete duplicates
          });

          // Step 2: If nothing was replaced, append instead
          if (replacedOnce) {
            console.log(
              `Chapter "${docToSummarize.title}" existed and was replaced (duplicates removed if any).`
            );
          } else {
            newMemoryContent += `\n\n${newChapterSection}`;
            console.log(
              `Chapter "${docToSummarize.title}" did not exist and was appended.`
            );
          }

          return currentBibleEntries.map((e) =>
            e.type === "Memory" ? { ...e, content: newMemoryContent } : e
          );
        });
      }
    },
    [apiKey, llmEndpoint, model, modelContextWindow, setBibleEntries]
  );

  const handleRecreateMemory = useCallback(async () => {
    setIsGenerating(true);
    setGenerationMessage("Recreating memory...");
    try {
      const memoryContent = await generateInitialMemory(
        documents,
        apiKey,
        llmEndpoint,
        model,
        modelContextWindow
      );
      if (memoryContent) {
        setBibleEntries((currentBibleEntries) => {
          const memoryEntry = currentBibleEntries.find(
            (e) => e.type === "Memory"
          );
          if (memoryEntry) {
            return currentBibleEntries.map((e) =>
              e.id === memoryEntry.id ? memoryContent : e
            );
          }
          return currentBibleEntries; // Should not happen if initialized
        });
      }
    } catch (err) {
      setError(`Failed to recreate memory: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [
    documents,
    apiKey,
    llmEndpoint,
    model,
    modelContextWindow,
    setBibleEntries,
    setError,
    setIsGenerating,
    setGenerationMessage,
  ]);

  useDebouncedEffect(
    () => {
      if (
        isInitializing ||
        !activeProjectId ||
        !prevDocuments ||
        !llmEndpoint ||
        !model
      )
        return;

      const changedDocs = documents.filter((doc) => {
        const prevDoc = prevDocuments.find((p) => p.id === doc.id);
        return (
          prevDoc &&
          doc.content.trim().length > 50 &&
          doc.content !== prevDoc.content
        );
      });

      if (changedDocs.length > 0) {
        if (memoryUpdateAbortController.current) {
          memoryUpdateAbortController.current.abort();
        }
        memoryUpdateAbortController.current = new AbortController();
        updateMemory(
          changedDocs[0],
          memoryUpdateAbortController.current.signal
        );
      }
    },
    [
      documents,
      isInitializing,
      activeProjectId,
      prevDocuments,
      llmEndpoint,
      updateMemory,
    ],
    5000
  );

  // --- Document & Bible Management Handlers ---
  const handleAddDocument = () => {
    const newId = Date.now();
    setDocuments([
      ...documents,
      { id: newId, title: `New Chapter ${documents.length + 1}`, content: "" },
    ]);
    setActiveDocumentId(newId);
  };
  const handleDeleteDocument = (id) => {
    const rem = documents.filter((d) => d.id !== id);
    setDocuments(rem);
    if (activeDocumentId === id)
      setActiveDocumentId(rem.length > 0 ? rem[0].id : null);
  };
  const handleRenameDocument = (id, title) => {
    setDocuments((docs) =>
      docs.map((d) => (d.id === id ? { ...d, title } : d))
    );
  };

  const handleAddBibleEntry = ({ title, type }) => {
    if (
      (type === "Plot Summary" &&
        bibleEntries.some((e) => e.type === "Plot Summary")) ||
      (type === "Instructions" &&
        bibleEntries.some((e) => e.type === "Instructions"))
    ) {
      setError(`A ${type} entry already exists.`);
      return;
    }
    const newId = Date.now();
    setBibleEntries([...bibleEntries, { id: newId, title, type, content: "" }]);
    setActiveBibleEntryId(newId);
  };
  const handleDeleteBibleEntry = (id) => {
    const entryToDelete = bibleEntries.find((e) => e.id === id);
    if (
      entryToDelete.type === "Plot Summary" ||
      entryToDelete.type === "Instructions" ||
      entryToDelete.type === "Memory"
    ) {
      setError(`Cannot delete the protected entry: "${entryToDelete.title}".`);
      return;
    }
    const rem = bibleEntries.filter((b) => b.id !== id);
    setBibleEntries(rem);
    if (activeBibleEntryId === id) setActiveBibleEntryId(null);
  };
  const handleRenameBibleEntry = (id, title) => {
    setBibleEntries((entries) =>
      entries.map((e) => (e.id === id ? { ...e, title } : e))
    );
  };

  // --- Render Logic ---
  const memoryEntry = bibleEntries.find((e) => e.type === "Memory");

  const sidebarItems =
    activeSidebarTab === "outline"
      ? documents
      : activeSidebarTab === "bible"
      ? bibleEntries.filter((e) => e.type !== "Memory")
      : [];
  const activeItemId =
    activeSidebarTab === "outline" ? activeDocumentId : activeBibleEntryId;
  const sidebarProps = {
    title:
      activeSidebarTab === "outline"
        ? "Outline"
        : activeSidebarTab === "bible"
        ? "Story Bible"
        : "Memory",
    items: sidebarItems,
    activeItemId: activeItemId,
    onSelect:
      activeSidebarTab === "outline"
        ? setActiveDocumentId
        : setActiveBibleEntryId,
    onAdd:
      activeSidebarTab === "outline"
        ? handleAddDocument
        : () => setIsNewBibleEntryModalOpen(true),
    onDelete:
      activeSidebarTab === "outline"
        ? handleDeleteDocument
        : handleDeleteBibleEntry,
    onRename:
      activeSidebarTab === "outline"
        ? handleRenameDocument
        : handleRenameBibleEntry,
    showAddButton: activeSidebarTab !== "memory",
  };

  return (
    <div className="bg-gray-900 text-gray-200 font-sans min-h-screen flex flex-col">
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
        }}
        onSave={handleSaveSettings}
        initialEndpoint={baseUrl}
        initialApiKey={apiKey}
        initialMaxTokens={maxTokens}
        initialGenerationPreset={generationSettings.preset}
        initialGenerationSettings={generationSettings}
        initialContextWindow={modelContextWindow}
        errorMessage={settingsError}
      />
      <NewBibleEntryModal
        isOpen={isNewBibleEntryModalOpen}
        onClose={() => setIsNewBibleEntryModalOpen(false)}
        onAdd={handleAddBibleEntry}
        bibleEntries={bibleEntries}
      />

      <Header
        projects={projects}
        activeProjectId={activeProjectId}
        onSwitchProject={handleSwitchProject}
        onNewProject={handleNewProject}
        onImportProject={handleImportProject}
        onExportProject={handleExportProject}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isProcessing={isInitializing}
        isGenerating={isGenerating}
        generationMessage={generationMessage}
      />

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 h-[calc(100vh-69px)]">
        <div className="lg:col-span-2 h-full min-h-0">
          <Sidebar
            activeTab={activeSidebarTab}
            setActiveTab={setActiveSidebarTab}
            {...sidebarProps}
            disabled={isInitializing}
          />
        </div>

        <MainContent
          documents={documents}
          setDocuments={setDocuments}
          activeDocumentId={activeDocumentId}
          bibleEntries={bibleEntries}
          setBibleEntries={setBibleEntries}
          activeBibleEntryId={activeBibleEntryId}
          activeSidebarTab={activeSidebarTab}
          isInitializing={isInitializing}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
          generationMessage={generationMessage}
          setGenerationMessage={setGenerationMessage}
          error={error}
          setError={setError}
          llmEndpoint={llmEndpoint}
          apiKey={apiKey}
          model={model}
          generationSettings={generationSettings}
          maxTokens={maxTokens}
          modelContextWindow={modelContextWindow}
          setIsSettingsOpen={setIsSettingsOpen}
          memoryEntry={memoryEntry}
          onRecreateMemory={handleRecreateMemory}
        />
      </main>
    </div>
  );
};

export default App;
