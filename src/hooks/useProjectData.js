import { useState, useCallback } from "react";
import * as storage from "../storage";
import { buildMemoryUpdatePrompt } from "../prompt-builder";

export const useProjectData = (activeProjectId, generateInitialMemory) => {
  const [documents, setDocuments] = useState([]);
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [bibleEntries, setBibleEntries] = useState([]);
  const [activeBibleEntryId, setActiveBibleEntryId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initMessage, setInitMessage] = useState("Loading your novel...");
  const [error, setError] = useState("");

  const loadProjectData = useCallback(
    async (projectId) => {
      if (!projectId) {
        setIsInitializing(false);
        return;
      }

      setIsInitializing(true);
      setInitMessage("Loading project...");

      try {
        const projectData = await storage.getProject(projectId);
        if (!projectData) {
          setError(`Could not load project with ID: ${projectId}`);
          setIsInitializing(false);
          return;
        }

        const hasMemory = projectData.bibleEntries.some(
          (e) => e.type === "Memory"
        );

        if (hasMemory) {
          setDocuments(projectData.documents);
          setBibleEntries(projectData.bibleEntries);
          setActiveDocumentId(projectData.activeDocumentId);
          setActiveBibleEntryId(projectData.activeBibleEntryId);
          localStorage.setItem("activeProjectId", projectId);
        } else {
          setInitMessage("Project summary not found. Generating now...");
          const newMemoryEntry = await generateInitialMemory(
            projectData.documents
          );
          const finalBibleEntries = [
            ...projectData.bibleEntries,
            newMemoryEntry || {
              id: Date.now() + 99,
              title: "Memory",
              type: "Memory",
              content: "# Memory\n\nA summary of events as they happen.",
            },
          ];

          setDocuments(projectData.documents);
          setBibleEntries(finalBibleEntries);
          setActiveDocumentId(projectData.activeDocumentId);
          setActiveBibleEntryId(projectData.activeBibleEntryId);
          await storage.saveProject({
            ...projectData,
            bibleEntries: finalBibleEntries,
          });
        }
      } catch (err) {
        console.error("Failed to load project data:", err);
        setError("Could not load project data from the database.");
      } finally {
        setIsInitializing(false);
      }
    },
    [generateInitialMemory]
  );

  return {
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
  };
};
