import React, { useState, useEffect, useCallback } from "react";
import { useGenerationPresets } from "../hooks/useGenerationPresets";
import CustomPresetModal from "./CustomPresetModal";

const SettingsModal = ({
  isOpen,
  onClose,
  onSave,
  initialEndpoint,
  initialApiKey,
  initialMaxTokens,
  initialGenerationPreset,
  initialModel,
  initialContextWindow,
  errorMessage,
  forceOpen = false,
}) => {
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [maxTokens, setMaxTokens] = useState(300);
  const [contextWindow, setContextWindow] = useState(8192);
  const {
    preset,
    selectPreset,
    currentSettings,
    updateCurrentSettings,
    availablePresets,
    saveCustomPreset,
    deleteCustomPreset,
  } = useGenerationPresets(initialGenerationPreset);
  const [isSaving, setIsSaving] = useState(false);
  const [isCustomPresetModalOpen, setIsCustomPresetModalOpen] = useState(false);
  const [models, setModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [modelFilter, setModelFilter] = useState("");

  useEffect(() => {
    if (isOpen) {
      setEndpoint(initialEndpoint);
      setApiKey(initialApiKey);
      setMaxTokens(initialMaxTokens);
      selectPreset(initialGenerationPreset);
      setSelectedModel(initialModel);
      setContextWindow(initialContextWindow);
    }
  }, [
    isOpen,
    initialEndpoint,
    initialApiKey,
    initialMaxTokens,
    initialGenerationPreset,
    initialModel,
    initialContextWindow,
    selectPreset,
  ]);

  const handleSettingsChange = (param, value) => {
    updateCurrentSettings({ [param]: value });
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    const finalSettings = {
      ...currentSettings,
      preset,
    };
    await onSave(
      endpoint,
      apiKey,
      maxTokens,
      finalSettings,
      selectedModel,
      contextWindow
    );
    setIsSaving(false);
  };

  const handleClose = () => {
    if (!forceOpen) {
      onClose();
    }
  };

  const fetchModels = async () => {
    if (!endpoint) {
      setModelError("Please enter an endpoint URL first.");
      return;
    }
    setIsLoadingModels(true);
    setModelError("");
    setModels([]);
    setSelectedModel("");

    try {
      const headers = { "Content-Type": "application/json" };
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
      const response = await fetch(`${endpoint}/models`, {
        headers,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      const data = await response.json();
      setModels(data.data || []);
    } catch (err) {
      setModelError(err.message);
    } finally {
      setIsLoadingModels(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center"
      onClick={handleClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-2">AI Settings</h2>
        {forceOpen && (
          <p className="text-sm text-yellow-400 mb-4">
            Please configure and save your AI provider settings to begin.
          </p>
        )}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="endpoint"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              LLM Endpoint URL
            </label>
            <input
              type="url"
              id="endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="w-full bg-gray-900 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Must be an OpenAI API compatible endpoint.
            </p>
          </div>
          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-gray-900 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-end space-x-2">
            <div className="flex-grow">
              <button
                onClick={fetchModels}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white font-semibold transition-colors disabled:bg-gray-800 disabled:cursor-not-allowed"
                disabled={isLoadingModels || !endpoint}
              >
                {isLoadingModels ? "Loading Models..." : "Get Models"}
              </button>
            </div>
          </div>

          {modelError && <p className="text-sm text-red-400">{modelError}</p>}

          {models.length > 0 && (
            <div>
              <label
                htmlFor="modelFilter"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Filter Models
              </label>
              <input
                type="text"
                id="modelFilter"
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                placeholder="Filter models..."
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-md px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <label
                htmlFor="selectedModel"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Select Model
              </label>
              <select
                id="selectedModel"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Select a model --</option>
                {models
                  .filter((model) =>
                    model.id.toLowerCase().includes(modelFilter.toLowerCase())
                  )
                  .map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.id}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div
            className={!selectedModel ? "opacity-50 pointer-events-none" : ""}
          >
            <div>
              <label
                htmlFor="maxTokens"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Max Tokens
              </label>
              <input
                type="number"
                id="maxTokens"
                value={maxTokens}
                onChange={(e) =>
                  setMaxTokens(parseInt(e.target.value, 10) || 0)
                }
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label
                htmlFor="contextWindow"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Context Window
              </label>
              <input
                type="number"
                id="contextWindow"
                value={contextWindow}
                onChange={(e) =>
                  setContextWindow(parseInt(e.target.value, 10) || 0)
                }
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                The maximum number of tokens the model can handle.
              </p>
            </div>
            <div>
              <label
                htmlFor="preset"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Generation Preset
              </label>
              <select
                id="preset"
                value={preset}
                onChange={(e) => selectPreset(e.target.value)}
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Object.entries(availablePresets).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              {currentSettings && (
                <div className="mt-2 text-xs text-gray-400 bg-gray-900/50 p-3 rounded-md border border-gray-700/50">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {[
                      "temperature",
                      "top_p",
                      "top_k",
                      "repetition_penalty",
                    ].map((param) => (
                      <div key={param}>
                        <label
                          htmlFor={param}
                          className="block text-sm font-medium text-gray-300 mb-1 capitalize"
                        >
                          {param.replace("_", " ")}
                        </label>
                        <input
                          type="number"
                          id={param}
                          step={param === "temperature" ? 0.01 : 1}
                          min={0}
                          value={currentSettings[param] || 0}
                          onChange={(e) =>
                            handleSettingsChange(
                              param,
                              parseFloat(e.target.value)
                            )
                          }
                          className="w-full bg-gray-800 text-white border border-gray-600 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => setIsCustomPresetModalOpen(true)}
                  className="flex-1 px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md text-white font-semibold transition-colors"
                >
                  Save as Custom Preset
                </button>
                {availablePresets[preset]?.custom && (
                  <button
                    onClick={() => deleteCustomPreset(preset)}
                    className="flex-1 px-4 py-2 text-sm bg-red-800 hover:bg-red-700 rounded-md text-white font-semibold transition-colors"
                  >
                    Delete Preset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <CustomPresetModal
          isOpen={isCustomPresetModalOpen}
          onClose={() => setIsCustomPresetModalOpen(false)}
          onSave={saveCustomPreset}
          currentSettings={currentSettings}
        />
        {errorMessage && (
          <div className="mt-4 text-sm text-red-400 bg-red-900/50 p-3 rounded-md">
            {errorMessage}
          </div>
        )}
        <div className="mt-8 flex justify-end space-x-3">
          {!forceOpen && (
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white font-semibold transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-white font-semibold transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
            disabled={isSaving || !endpoint || !apiKey || !selectedModel}
          >
            {isSaving ? "Testing..." : "Save & Test"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
