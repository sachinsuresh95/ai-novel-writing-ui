import React from "react";
import AIToolButton from "./AIToolButton";
import AIPromptPopover from "./AIPromptPopover";
import { BrainIcon, PenIcon, SparklesIcon } from "./icons";

const AIToolbar = ({
  activeAITool,
  handleAIToolClick,
  customInstruction,
  setCustomInstruction,
  generateText,
  isEditorActive,
  isGeneratingOrProtected,
  canRewrite,
  selectedText,
  activeSidebarTab,
}) => (
  <div className="flex items-center space-x-2 mb-2 p-2 bg-gray-800 rounded-t-lg border-b border-gray-700">
    <AIToolButton
      icon={<BrainIcon className="w-5 h-5" />}
      label="Brainstorm"
      onClick={() => handleAIToolClick("brainstorm")}
      disabled={!isEditorActive || isGeneratingOrProtected}
      tooltip={
        isGeneratingOrProtected
          ? "Action disabled during AI generation or for protected entries"
          : "Get ideas for this entry"
      }
    >
      {activeAITool === "brainstorm" && (
        <AIPromptPopover
          instruction={customInstruction}
          setInstruction={setCustomInstruction}
          onGenerate={(instruction) => generateText("brainstorm", instruction)}
          onAuto={() => generateText("brainstorm")}
          placeholder="e.g., What if they had a secret?"
        />
      )}
    </AIToolButton>
    <AIToolButton
      icon={<PenIcon className="w-5 h-5" />}
      label="Write"
      onClick={() => handleAIToolClick("write")}
      disabled={!isEditorActive || isGeneratingOrProtected}
      tooltip={
        isGeneratingOrProtected
          ? "Action disabled during AI generation or for protected entries"
          : activeSidebarTab === "outline"
          ? "Continue writing from cursor"
          : "Generate content for this entry"
      }
    >
      {activeAITool === "write" && (
        <AIPromptPopover
          instruction={customInstruction}
          setInstruction={setCustomInstruction}
          onGenerate={(instruction) => generateText("write", instruction)}
          onAuto={() => generateText("write")}
          placeholder="e.g., A mysterious stranger arrives..."
        />
      )}
    </AIToolButton>
    <AIToolButton
      icon={<SparklesIcon className="w-5 h-5" />}
      label="Rewrite"
      onClick={() => handleAIToolClick("rewrite")}
      disabled={!canRewrite || isGeneratingOrProtected}
      tooltip={
        activeSidebarTab === "outline"
          ? "Select text to rewrite"
          : "Rewrite the entire entry"
      }
    >
      {activeAITool === "rewrite" && (
        <AIPromptPopover
          instruction={customInstruction}
          setInstruction={setCustomInstruction}
          onGenerate={(instruction) => generateText("rewrite", instruction)}
          onAuto={() => generateText("rewrite")}
          placeholder="e.g., Make it more poetic..."
        />
      )}
    </AIToolButton>
    {activeSidebarTab === "outline" && (
      <AIToolButton
        icon={<SparklesIcon className="w-5 h-5" />}
        label="Describe"
        onClick={() => handleAIToolClick("describe")}
        disabled={!selectedText || isGeneratingOrProtected}
        tooltip="Select text to describe"
      >
        {activeAITool === "describe" && (
          <AIPromptPopover
            instruction={customInstruction}
            setInstruction={setCustomInstruction}
            onGenerate={(instruction) => generateText("describe", instruction)}
            onAuto={() => generateText("describe")}
            placeholder="e.g., Focus on the sounds and smells..."
          />
        )}
      </AIToolButton>
    )}
  </div>
);

export default AIToolbar;
