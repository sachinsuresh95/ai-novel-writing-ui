import React, { useState } from "react";
const CustomPresetModal = ({ isOpen, onClose, onSave, currentSettings }) => {
  const [presetName, setPresetName] = useState("");

  const handleSave = () => {
    if (presetName.trim()) {
      onSave(presetName.trim(), currentSettings);
      setPresetName("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-4">
          Save Custom Preset
        </h2>
        <p className="text-gray-400 mb-6">
          Save the current generation settings as a new preset.
        </p>
        <input
          type="text"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          placeholder="Enter preset name"
          className="w-full bg-gray-900 text-white border border-gray-600 rounded-md px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!presetName.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-white font-semibold transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
          >
            Save Preset
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomPresetModal;
