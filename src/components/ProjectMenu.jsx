import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDownIcon,
  FilePlusIcon,
  UploadIcon,
  DownloadIcon,
  TrashIcon,
  PenIcon,
} from "./icons";

const ProjectMenu = ({
  projects,
  activeProjectId,
  onSwitchProject,
  onNewProject,
  onImportProject,
  onExportProject,
  onDeleteProject,
  onRenameProject,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const activeProject = projects.find((p) => p.id === activeProjectId);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleImportClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        onImportProject(file);
      }
    };
    input.click();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-semibold text-white bg-gray-700 rounded-md hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span>{activeProject ? activeProject.name : "No Project"}</span>
        <ChevronDownIcon className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase">
              Switch Project
            </div>
            {projects.map((project) => (
              <a
                key={project.id}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchProject(project.id);
                  setIsOpen(false);
                }}
                className={`block px-3 py-2 text-sm truncate ${
                  project.id === activeProjectId
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                {project.name}
              </a>
            ))}
            <div className="border-t border-gray-700 my-1"></div>
            <a
              href="#"
              onClick={onNewProject}
              className="flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
            >
              <FilePlusIcon className="w-4 h-4 mr-2" />
              New Project
            </a>
            <a
              href="#"
              onClick={handleImportClick}
              className="flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
            >
              <UploadIcon className="w-4 h-4 mr-2" />
              Import Project
            </a>
            <a
              href="#"
              onClick={onExportProject}
              className={`flex items-center px-3 py-2 text-sm ${
                !activeProject
                  ? "text-gray-500 cursor-not-allowed"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Export Project
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (activeProject) {
                  onRenameProject(activeProjectId);
                  setIsOpen(false);
                }
              }}
              className={`flex items-center px-3 py-2 text-sm ${
                !activeProject
                  ? "text-gray-500 cursor-not-allowed"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <PenIcon className="w-4 h-4 mr-2" />
              Rename Project
            </a>
            <div className="border-t border-gray-700 my-1"></div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (projects.length > 1) {
                  onDeleteProject(activeProjectId);
                  setIsOpen(false);
                }
              }}
              className={`flex items-center px-3 py-2 text-sm ${
                !activeProject || projects.length <= 1
                  ? "text-gray-600 cursor-not-allowed"
                  : "text-red-400 hover:bg-red-900/50"
              }`}
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Delete Project
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectMenu;
