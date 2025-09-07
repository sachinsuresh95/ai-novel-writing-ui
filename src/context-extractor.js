export function extractBibleContext(bibleEntries, excludeId = null) {
  // Group entries by type, exclude current
  const grouped = {};
  const included = [];
  for (const entry of bibleEntries) {
    if (entry.id === excludeId || !entry.content?.trim()) continue;
    if (!grouped[entry.type]) grouped[entry.type] = [];
    grouped[entry.type].push(entry);
    included.push(entry);
  }
  let out = "";
  for (const type in grouped) {
    out += `\n${type}:\n`;
    for (const entry of grouped[type]) {
      out += `- ${entry.title}: ${entry.content}\n`;
    }
  }
  return { contextString: out.trim(), includedEntries: included };
}

export function extractStoryContext(doc, selection) {
  if (!doc || !selection) {
    return { preceding: "", following: "", selected: "" };
  }
  const { start, end } = selection;
  const content = doc.content || "";

  return {
    preceding: content.slice(0, start),
    following: content.slice(end),
    selected: content.slice(start, end),
  };
}

export function extractSelectiveBibleContext(
  bibleEntries,
  storyContext,
  chapterTitle
) {
  const relevantEntries = new Map();
  const analysisQueue = [storyContext];

  // 1. Always include Memory and Instructions for context
  const memory = bibleEntries.find((e) => e.type === "Memory");
  if (memory?.content) {
    // For Memory, only include summaries of chapters *before* the current one.
    const chapterTag = `<${chapterTitle}>`;
    const contentBeforeChapter = memory.content.split(chapterTag)[0];
    analysisQueue.push(contentBeforeChapter);
    if (!relevantEntries.has(memory.id)) {
      // We add a modified version of the Memory entry
      relevantEntries.set(memory.id, {
        ...memory,
        content: contentBeforeChapter,
      });
    }
  }
  const instructions = bibleEntries.find((e) => e.type === "Instructions");
  if (instructions?.content) {
    analysisQueue.push(instructions.content);
    if (!relevantEntries.has(instructions.id)) {
      relevantEntries.set(instructions.id, instructions);
    }
  }

  // 2. Add current chapter's outline to the queue if it exists
  const chapterOutline = bibleEntries.find(
    (e) => e.type === "Chapter Outline" && e.title === chapterTitle
  );
  if (chapterOutline?.content) {
    analysisQueue.push(chapterOutline.content);
    if (!relevantEntries.has(chapterOutline.id)) {
      relevantEntries.set(chapterOutline.id, chapterOutline);
    }
  }

  // 3. Process the queue to find all relevant entries by reference
  let currentContext;
  while ((currentContext = analysisQueue.shift())) {
    for (const entry of bibleEntries) {
      if (
        entry.content &&
        !relevantEntries.has(entry.id) &&
        currentContext.includes(entry.title)
      ) {
        relevantEntries.set(entry.id, entry);
        analysisQueue.push(entry.content);
      }
    }
  }

  // 4. Group and format the entries
  const grouped = {};
  for (const entry of relevantEntries.values()) {
    // Don't add the Memory again if it was already added
    if (entry.type === "Memory" && grouped["Memory"]) continue;
    if (!grouped[entry.type]) grouped[entry.type] = [];
    grouped[entry.type].push(entry);
  }

  let out = "";
  // Ensure Memory and Instructions are first if they exist
  const typeOrder = ["Memory", "Instructions"];
  for (const type of typeOrder) {
    if (grouped[type]) {
      out += `
${type}:
`;
      for (const entry of grouped[type]) {
        out += `${entry.content}\n`; // For these, we just dump the content
      }
    }
  }

  for (const type in grouped) {
    if (typeOrder.includes(type)) continue;
    out += `
${type}:
`;
    for (const entry of grouped[type]) {
      out += `- ${entry.title}: ${entry.content}\n`;
    }
  }
  return {
    contextString: out.trim(),
    includedEntries: Array.from(relevantEntries.values()),
  };
}
