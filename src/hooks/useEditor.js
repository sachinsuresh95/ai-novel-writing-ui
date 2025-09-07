import { useState, useRef, useCallback, useEffect } from "react";

export const useEditor = ({
  documents,
  setDocuments,
  activeDocumentId,
  bibleEntries,
  setBibleEntries,
  activeBibleEntryId,
  activeSidebarTab,
}) => {
  const editorRef = useRef(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [selectedText, setSelectedText] = useState("");

  const activeContent =
    (activeSidebarTab === "outline"
      ? documents.find((d) => d.id === activeDocumentId)?.content
      : bibleEntries.find((b) => b.id === activeBibleEntryId)?.content) ?? "";

  useEffect(() => {
    // On mount or when content loads, set cursor to the end
    setSelection({ start: activeContent.length, end: activeContent.length });
  }, [activeDocumentId, activeBibleEntryId]); // Reruns when the active item changes

  const handleSelectionChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const { selectionStart, selectionEnd, value } = editor;
    const currentSelectedText = value.substring(selectionStart, selectionEnd);
    setSelection({ start: selectionStart, end: selectionEnd });
    setSelectedText(currentSelectedText);
  }, []);

  const handleInsertText = (textToInsert) => {
    const editor = editorRef.current;
    if (!editor) return;
    const activeContent =
      (activeSidebarTab === "outline"
        ? documents.find((d) => d.id === activeDocumentId)?.content
        : bibleEntries.find((b) => b.id === activeBibleEntryId)?.content) ?? "";
    const { start, end } = selection;
    const newText =
      activeContent.substring(0, start) +
      textToInsert +
      activeContent.substring(end);
    if (activeSidebarTab === "outline" && activeDocumentId) {
      setDocuments((docs) =>
        docs.map((d) =>
          d.id === activeDocumentId ? { ...d, content: newText } : d
        )
      );
    } else if (activeSidebarTab === "bible" && activeBibleEntryId) {
      setBibleEntries((entries) =>
        entries.map((e) =>
          e.id === activeBibleEntryId ? { ...e, content: newText } : e
        )
      );
    }
    setTimeout(() => {
      const newCursorPos = start + textToInsert.length;
      editor.focus();
      editor.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleManuscriptChange = (e) => {
    const newContent = e.target.value;
    if (activeSidebarTab === "outline" && activeDocumentId) {
      setDocuments((docs) =>
        docs.map((d) =>
          d.id === activeDocumentId ? { ...d, content: newContent } : d
        )
      );
    } else if (activeSidebarTab === "bible" && activeBibleEntryId) {
      setBibleEntries((entries) =>
        entries.map((e) =>
          e.id === activeBibleEntryId ? { ...e, content: newContent } : e
        )
      );
    }
  };

  const memoryEntry = bibleEntries.find((e) => e.type === "Memory");

  let activeItem = null;
  if (activeSidebarTab === "outline") {
    activeItem = documents.find((d) => d.id === activeDocumentId);
  } else if (activeSidebarTab === "bible") {
    activeItem = bibleEntries.find((b) => b.id === activeBibleEntryId);
  } else if (activeSidebarTab === "memory") {
    activeItem = memoryEntry;
  }

  const editorContent = activeItem?.content ?? "";
  const editorKey = activeItem?.id ?? "memory-view";
  const isEditorActive = !!activeItem;

  return {
    editorRef,
    selection,
    selectedText,
    handleSelectionChange,
    handleInsertText,
    handleManuscriptChange,
    activeItem,
    editorContent,
    editorKey,
    isEditorActive,
  };
};
