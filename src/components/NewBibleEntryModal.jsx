import React, { useState } from "react";
import { BIBLE_ENTRY_TYPES } from "../constants";

const NewBibleEntryModal = ({ isOpen, onClose, onAdd, bibleEntries }) => {
  const [title, setTitle] = useState("");
  const [type, setType] = useState(BIBLE_ENTRY_TYPES[0]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (title.trim()) {
      onAdd({ title, type });
      onClose();
      setTitle("");
      setType(BIBLE_ENTRY_TYPES[0]);
    }
  };

  const availableTypes = BIBLE_ENTRY_TYPES.filter((t) => {
    if (t === "Plot Summary" || t === "Instructions") {
      return !bibleEntries.some((e) => e.type === t);
    }
    return true;
  });

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-6">
          New Story Bible Entry
        </h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="entryTitle"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Title
            </label>
            <input
              id="entryTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Captain Eva Rostova"
              className="w-full bg-gray-900 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="entryType"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Type
            </label>
            <select
              id="entryType"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-gray-900 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-8 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-white font-semibold transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewBibleEntryModal;