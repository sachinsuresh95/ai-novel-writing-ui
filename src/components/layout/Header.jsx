import React from "react";
import { BotIcon, SettingsIcon } from "../icons";
import ProjectMenu from "../ProjectMenu";

const Header = ({
  projects,
  activeProjectId,
  onSwitchProject,
  onNewProject,
  onImportProject,
  onExportProject,
  onDeleteProject,
  onRenameProject,
  onOpenSettings,
  isProcessing,
  isGenerating,
  generationMessage,
}) => (
  <header className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
    <div className="flex items-center space-x-4">
      <BotIcon className="w-6 h-6 text-indigo-400" />
      <h1 className="text-xl font-bold text-white">AI Novelist</h1>
      <ProjectMenu
        projects={projects}
        activeProjectId={activeProjectId}
        onSwitchProject={onSwitchProject}
        onNewProject={onNewProject}
        onImportProject={onImportProject}
        onExportProject={onExportProject}
        onDeleteProject={onDeleteProject}
        onRenameProject={onRenameProject}
        disabled={isProcessing || isGenerating}
      />
    </div>
    <div className="flex items-center space-x-4">
      {isGenerating && (
        <span className="text-sm text-gray-400 italic">
          {generationMessage}
        </span>
      )}
      <button
        onClick={onOpenSettings}
        className="p-2 rounded-full hover:bg-gray-700 transition-colors"
        disabled={isProcessing || isGenerating}
      >
        <SettingsIcon className="w-5 h-5 text-gray-300" />
      </button>
    </div>
  </header>
);

export default Header;
