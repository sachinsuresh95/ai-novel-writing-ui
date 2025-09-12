import { useState, useCallback, useEffect } from "react";
import { EMBEDDING_TYPES } from "../constants";
import storage from "../storage";
import vectorizer from "../services/vectorizer";

export const useProjectData = (activeProjectId, generateInitialMemory) => {
  const {
    getAllEmbeddingKeys,
    saveEmbedding,
    getProject,
    saveProject,
    deleteEmbedding,
  } = storage;
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
        const projectData = await getProject(projectId);
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
              content: "",
            },
          ];

          setDocuments(projectData.documents);
          setBibleEntries(finalBibleEntries);
          setActiveDocumentId(projectData.activeDocumentId);
          setActiveBibleEntryId(projectData.activeBibleEntryId);
          await saveProject({
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
    [generateInitialMemory, saveProject, getProject]
  );

  useEffect(() => {
    if (activeProjectId && bibleEntries?.length > 0) {
      const syncEmbeddings = async () => {
        const allBibleEntryIds = bibleEntries.map((e) => e.id);
        const embeddingKeys = await getAllEmbeddingKeys();
        const missingIds = allBibleEntryIds.filter(
          (id) => !embeddingKeys.includes(id)
        );

        if (missingIds.length > 0) {
          console.log(
            `Generating embeddings for ${missingIds.length} missing entries...`
          );
          for (const id of missingIds) {
            const entry = bibleEntries.find((e) => e.id === id);
            if (entry && EMBEDDING_TYPES.has(entry.type)) {
              const embedding = await vectorizer.generateEmbedding(
                entry.content
              );
              await saveEmbedding(entry.id, embedding);
            } else if (entry) {
              console.log(
                `Skipping embedding for non-target type: ${entry.type}`
              );
            }
          }
        }
      };

      syncEmbeddings();
    }
  }, [activeProjectId, bibleEntries, getAllEmbeddingKeys, saveEmbedding]);

  const addBibleEntry = useCallback(
    async (newEntry) => {
      const entryWithId = { ...newEntry, id: Date.now() };
      setBibleEntries((prev) => [...prev, entryWithId]);

      if (EMBEDDING_TYPES.has(entryWithId.type)) {
        const embedding = await vectorizer.generateEmbedding(
          entryWithId.content
        );
        await saveEmbedding(entryWithId.id, embedding);
      } else {
        console.log(
          `Skipping embedding for new entry of non-target type: ${entryWithId.type}`
        );
      }

      return entryWithId;
    },
    [saveEmbedding]
  );

  const updateBibleEntry = useCallback(
    async (updatedEntry) => {
      setBibleEntries((prev) =>
        prev.map((entry) =>
          entry.id === updatedEntry.id ? updatedEntry : entry
        )
      );

      if (EMBEDDING_TYPES.has(updatedEntry.type)) {
        const newEmbedding = await vectorizer.generateEmbedding(
          updatedEntry.content
        );
        await saveEmbedding(updatedEntry.id, newEmbedding);
      } else {
        console.log(
          `Skipping embedding update for non-target type: ${updatedEntry.type}`
        );
      }
    },
    [saveEmbedding]
  );

  const deleteBibleEntry = useCallback(
    async (entryId) => {
      setBibleEntries((prev) => prev.filter((entry) => entry.id !== entryId));
      await deleteEmbedding(entryId);
    },
    [deleteEmbedding]
  );

  return {
    documents,
    setDocuments,
    activeDocumentId,
    setActiveDocumentId,
    bibleEntries,
    activeBibleEntryId,
    setActiveBibleEntryId,
    isInitializing,
    initMessage,
    error,
    setError,
    loadProjectData,
    addBibleEntry,
    updateBibleEntry,
    deleteBibleEntry,
  };
};
