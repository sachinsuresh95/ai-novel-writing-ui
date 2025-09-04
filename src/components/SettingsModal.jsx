import React, { useState, useEffect } from "react";
import { GENERATION_PRESETS } from "../constants";

const SettingsModal = ({
  isOpen,
  onClose,
  onSave,
  initialEndpoint,
  initialApiKey,
  initialMaxTokens,
  initialGenerationPreset,
  errorMessage,
  forceOpen = false,
}) => {
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [maxTokens, setMaxTokens] = useState(300);
  const [preset, setPreset] = useState("balanced");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEndpoint(initialEndpoint);
      setApiKey(initialApiKey);
      setMaxTokens(initialMaxTokens);
      setPreset(initialGenerationPreset);
    }
  }, [
    isOpen,
    initialEndpoint,
    initialApiKey,
    initialMaxTokens,
    initialGenerationPreset,
  ]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(endpoint, apiKey, maxTokens, preset);
    setIsSaving(false);
  };

  const handleClose = () => {
    if (!forceOpen) {
      onClose();
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
              onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-gray-900 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
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
              onChange={(e) => setPreset(e.target.value)}
              className="w-full bg-gray-900 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Object.entries(GENERATION_PRESETS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            {GENERATION_PRESETS[preset] && (
              <div className="mt-2 text-xs text-gray-400 bg-gray-900/50 p-3 rounded-md border border-gray-700/50">
                <p className="font-semibold text-gray-300 mb-1">
                  {GENERATION_PRESETS[preset].label} Parameters:
                </p>
                <ul className="list-disc list-inside space-y-1 font-mono">
                  {Object.entries(GENERATION_PRESETS[preset]).map(
                    ([key, value]) =>
                      key !== "label" && (
                        <li key={key}>
                          {key}: {String(value)}
                        </li>
                      )
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
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
            disabled={isSaving || !endpoint || !apiKey}
          >
            {isSaving ? "Testing..." : "Save & Test"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
