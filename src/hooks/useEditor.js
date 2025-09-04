import { useState, useRef, useCallback } from "react";

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
  const selectionRef = useRef({ start: 0, end: 0, text: "" });
  const [selectedText, setSelectedText] = useState("");

  const handleSelectionChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const { selectionStart, selectionEnd, value } = editor;
    const currentSelectedText = value.substring(selectionStart, selectionEnd);
    selectionRef.current = {
      start: selectionStart,
      end: selectionEnd,
      text: currentSelectedText,
    };
    setSelectedText(currentSelectedText);
  }, []);

  const handleInsertText = (textToInsert) => {
    const editor = editorRef.current;
    if (!editor) return;
    const activeContent =
      (activeSidebarTab === "outline"
        ? documents.find((d) => d.id === activeDocumentId)?.content
        : bibleEntries.find((b) => b.id === activeBibleEntryId)?.content) ?? "";
    const { start, end } = selectionRef.current;
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
    selectionRef,
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
