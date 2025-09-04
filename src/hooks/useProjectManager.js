import { useState, useEffect } from "react";
import * as storage from "../storage";

export const useProjectManager = () => {
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);

  useEffect(() => {
    const loadProjectList = async () => {
      try {
        const allProjects = await storage.getAllProjects();
        if (allProjects.length > 0) {
          setProjects(allProjects);
          const lastProjectId = localStorage.getItem("activeProjectId");
          const projectExists = allProjects.some((p) => p.id === lastProjectId);
          setActiveProjectId(projectExists ? lastProjectId : allProjects[0].id);
        } else {
          // Create a default project
          const newId = `proj_${Date.now()}`;
          const firstDocId = Date.now();
          const defaultProject = {
            id: newId,
            name: "My First Novel",
            documents: [
              {
                id: firstDocId,
                title: "Chapter 1",
                content: "The old house stood on a hill...",
              },
            ],
            bibleEntries: [
              {
                id: Date.now() + 1,
                title: "Plot Summary",
                type: "Plot Summary",
                content: "",
              },
              {
                id: Date.now() + 2,
                title: "Instructions",
                type: "Instructions",
                content: "",
              },
              {
                id: Date.now() + 3,
                title: "Memory",
                type: "Memory",
                content: "# Memory\n\nA summary of events as they happen.",
              },
            ],
            activeDocumentId: firstDocId,
            activeBibleEntryId: null,
          };
          await storage.saveProject(defaultProject);
          setProjects([{ id: newId, name: defaultProject.name }]);
          setActiveProjectId(newId);
        }
      } catch (err) {
        console.error("Failed to load projects:", err);
        // setError('Could not load project data from the database.');
      }
    };

    loadProjectList();
  }, []);

  const handleNewProject = async () => {
    const newProjectName = prompt("Enter new project name:", "New Project");
    if (!newProjectName) return;

    const newId = `proj_${Date.now()}`;
    const firstDocId = Date.now();
    const newProject = {
      id: newId,
      name: newProjectName,
      documents: [{ id: firstDocId, title: "Chapter 1", content: "" }],
      bibleEntries: [
        {
          id: Date.now() + 1,
          title: "Plot Summary",
          type: "Plot Summary",
          content: "",
        },
        {
          id: Date.now() + 2,
          title: "Instructions",
          type: "Instructions",
          content: "",
        },
        {
          id: Date.now() + 3,
          title: "Memory",
          type: "Memory",
          content: "# Memory\n\nA summary of events as they happen.",
        },
      ],
      activeDocumentId: firstDocId,
      activeBibleEntryId: null,
    };

    await storage.saveProject(newProject);
    const allProjects = await storage.getAllProjects();
    setProjects(allProjects);
    setActiveProjectId(newId);
  };

  const handleSwitchProject = (projectId) => {
    if (projectId !== activeProjectId) {
      setActiveProjectId(projectId);
    }
  };

  const handleExportProject = async () => {
    if (!activeProjectId) return;
    const projectData = await storage.getProject(activeProjectId);
    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectData.name.replace(/\s/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportProject = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const projectData = JSON.parse(e.target.result);
      projectData.id = `proj_${Date.now()}`; // Assign new ID to avoid conflicts
      await storage.saveProject(projectData);
      const allProjects = await storage.getAllProjects();
      setProjects(allProjects);
      setActiveProjectId(projectData.id);
    };
    reader.readAsText(file);
  };

  const handleDeleteProject = async (projectId) => {
    if (!projectId || projects.length <= 1) return;
    const projectToDelete = projects.find((p) => p.id === projectId);
    if (!projectToDelete) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the project "${projectToDelete.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    await storage.deleteProject(projectId);
    const remainingProjects = await storage.getAllProjects();
    setProjects(remainingProjects);
    if (activeProjectId === projectId) {
      setActiveProjectId(remainingProjects[0].id);
    }
  };

  const handleRenameProject = async (projectId) => {
    const projectToRename = projects.find((p) => p.id === projectId);
    if (!projectToRename) return;

    const newName = prompt("Enter new project name:", projectToRename.name);
    if (newName && newName !== projectToRename.name) {
      const updatedProjects = projects.map((p) =>
        p.id === projectId ? { ...p, name: newName } : p
      );
      setProjects(updatedProjects);
    }
  };

  return {
    projects,
    activeProjectId,
    setActiveProjectId,
    handleNewProject,
    handleSwitchProject,
    handleExportProject,
    handleImportProject,
    handleDeleteProject,
    handleRenameProject,
    setProjects,
  };
};
