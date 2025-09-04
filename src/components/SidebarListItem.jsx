import React from "react";
import { EditIcon, TrashIcon } from "./icons";

const SidebarListItem = ({
  item,
  isActive,
  onSelect,
  onStartRename,
  onDelete,
  renamingId,
  tempTitle,
  setTempTitle,
  onConfirmRename,
  onKeyDown,
  renameInputRef,
}) => (
  <div
    className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-sm ${
      isActive
        ? "bg-indigo-600/50 text-white"
        : "text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
    }`}
    onClick={() => onSelect(item.id)}
  >
    {renamingId === item.id ? (
      <input
        ref={renameInputRef}
        type="text"
        value={tempTitle}
        onChange={(e) => setTempTitle(e.target.value)}
        onBlur={onConfirmRename}
        onKeyDown={onKeyDown}
        className="bg-gray-900 text-white w-full text-sm p-0 border-0 focus:ring-0"
      />
    ) : (
      <span className="truncate flex-grow">{item.title}</span>
    )}
    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStartRename(item);
        }}
        className="p-1 hover:text-white"
      >
        <EditIcon className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        className="p-1 hover:text-red-400"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export default SidebarListItem;
