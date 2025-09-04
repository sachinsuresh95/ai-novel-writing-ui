import React, { useState, useEffect, useRef } from "react";
import TabButton from "./TabButton";
import SidebarListItem from "./SidebarListItem";
import { PlusCircleIcon } from "./icons";
import { BIBLE_ENTRY_TYPES } from "../constants";

const Sidebar = ({
  activeTab,
  setActiveTab,
  title,
  items,
  activeItemId,
  onSelect,
  onAdd,
  onDelete,
  onRename,
}) => {
  const [renamingId, setRenamingId] = useState(null);
  const [tempTitle, setTempTitle] = useState("");
  const renameInputRef = useRef(null);

  const handleStartRename = (item) => {
    setRenamingId(item.id);
    setTempTitle(item.title);
  };

  const handleConfirmRename = () => {
    if (renamingId && tempTitle) onRename(renamingId, tempTitle);
    setRenamingId(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleConfirmRename();
    if (e.key === "Escape") setRenamingId(null);
  };

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const renderProps = {
    isActive: false,
    onSelect,
    onStartRename: handleStartRename,
    onDelete,
    renamingId,
    tempTitle,
    setTempTitle,
    onConfirmRename: handleConfirmRename,
    onKeyDown: handleKeyDown,
    renameInputRef,
  };

  const groupedBibleItems = items.reduce((acc, item) => {
    if (item.type) {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
    }
    return acc;
  }, {});

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 flex flex-col h-full min-h-0">
      <div>
        <div className="flex border-b border-gray-700">
          <TabButton
            title="Outline"
            isActive={activeTab === "outline"}
            onClick={() => setActiveTab("outline")}
          />
          <TabButton
            title="Story Bible"
            isActive={activeTab === "bible"}
            onClick={() => setActiveTab("bible")}
          />
          <TabButton
            title="Memory"
            isActive={activeTab === "memory"}
            onClick={() => setActiveTab("memory")}
          />
        </div>
        <div className="flex justify-between items-center my-4">
          <h2 className="font-bold text-white">{title}</h2>
          {activeTab !== "memory" && (
            <button
              onClick={onAdd}
              title={`Add new ${
                activeTab === "outline" ? "document" : "entry"
              }`}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <PlusCircleIcon className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
      <div className="space-y-1 overflow-y-auto flex-grow min-h-0">
        {activeTab === "outline"
          ? items.map((item) => (
              <SidebarListItem
                key={item.id}
                item={item}
                {...renderProps}
                isActive={item.id === activeItemId}
              />
            ))
          : activeTab === "bible"
          ? BIBLE_ENTRY_TYPES.map(
              (type) =>
                groupedBibleItems[type] &&
                groupedBibleItems[type].length > 0 && (
                  <div key={type}>
                    <h3 className="text-xs font-bold uppercase text-gray-500 mt-4 mb-2 px-2">
                      {type}
                    </h3>
                    {groupedBibleItems[type].map((item) => (
                      <SidebarListItem
                        key={item.id}
                        item={item}
                        {...renderProps}
                        isActive={item.id === activeItemId}
                      />
                    ))}
                  </div>
                )
            )
          : null}
        {items.length === 0 && activeTab !== "memory" && (
          <p className="text-center text-xs text-gray-500 mt-4">
            Click the '+' to add your first item.
          </p>
        )}
        {activeTab === "memory" && (
          <p className="text-center text-xs text-gray-500 mt-4">
            A read-only view of the story's chronological events.
          </p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
