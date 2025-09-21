import findSimilarEntries from "./services/similaritySearch";
import { EMBEDDING_TYPES } from "./constants";
export function extractCustomInstructions(bibleEntries) {
  const instructions = bibleEntries.filter(
    (e) => e.type === "Instructions" && e.content?.trim()
  );
  if (!instructions.length) return "";
  return instructions.map((i) => i.content).join("\n\n---\n\n");
}

export function extractBibleContext(bibleEntries, excludeId = null) {
  // Group entries by type, exclude current and Instructions (handled separately)
  const grouped = {};
  const included = [];
  for (const entry of bibleEntries) {
    if (
      entry.id === excludeId ||
      !entry.content?.trim() ||
      entry.type === "Instructions"
    )
      continue;
    if (!grouped[entry.type]) grouped[entry.type] = [];
    grouped[entry.type].push(entry);
    included.push(entry);
  }

  let out = "## CONTEXT:\n";
  if (Object.keys(grouped).length === 0) {
    out += "(No relevant bible context)\n";
  } else {
    // Prioritize certain types
    const priorityOrder = ["Memory", "Chapter Outline"];
    const otherTypes = Object.keys(grouped).filter(
      (t) => !priorityOrder.includes(t)
    );
    const orderedTypes = [
      ...priorityOrder.filter((t) => grouped[t]),
      ...otherTypes,
    ];

    for (const type of orderedTypes) {
      if (!grouped[type]) continue;
      out += `### ${type}\n`;
      for (const entry of grouped[type]) {
        out += `#### ${entry.title}: ${entry.content}\n`;
      }
      out += `\n\n`;
    }
  }
  out += "\n\n";

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

export async function extractSelectiveBibleContext(
  bibleEntries,
  storyContext,
  chapterTitle,
  userInstruction = ""
) {
  const relevantEntries = new Map();
  const analysisQueue = [storyContext];

  // 1. Extract Memory (truncated) and Chapter Outline
  const memory = bibleEntries.find((e) => e.type === "Memory");
  let memoryContent = "";
  if (memory?.content) {
    const chapterTag = `<${chapterTitle}>`;
    memoryContent = memory.content.split(chapterTag)[0];
    relevantEntries.set(memory.id, { ...memory, content: memoryContent });
  }

  // 2. Add current chapter's outline
  const chapterOutline = bibleEntries.find(
    (e) => e.type === "Chapter Outline" && e.title === chapterTitle
  );
  if (chapterOutline?.content) {
    analysisQueue.push(chapterOutline.content);
    relevantEntries.set(chapterOutline.id, chapterOutline);
  }

  if (userInstruction) {
    analysisQueue.push(userInstruction);
  }

  // 3. Process queue for keyword matches (exclude Instructions)
  let currentContext;
  while ((currentContext = analysisQueue.shift())) {
    for (const entry of bibleEntries) {
      if (
        entry.content &&
        !relevantEntries.has(entry.id) &&
        entry.type !== "Instructions" &&
        currentContext.includes(entry.title)
      ) {
        relevantEntries.set(entry.id, entry);
        analysisQueue.push(entry.content);
      }
    }
  }

  // 4. Semantic similarity (exclude Instructions)
  const similarEntries = await findSimilarEntries(
    `${chapterOutline?.content ?? ""} ${storyContext} ${userInstruction}`,
    5
  );

  for (const result of similarEntries) {
    if (!relevantEntries.has(result.entryId)) {
      const entry = bibleEntries.find((e) => e.id === result.entryId);
      if (
        entry &&
        entry.type !== "Instructions" &&
        EMBEDDING_TYPES.has(entry.type)
      ) {
        relevantEntries.set(result.entryId, entry);
        console.log(`Added similar entry of target type: ${entry.type}`);
      } else if (entry && entry.type !== "Instructions") {
        console.log(
          `Skipping similar entry of non-target type: ${
            entry?.type || "unknown"
          }`
        );
      }
    }
  }

  // 5. Group for formatting (exclude Instructions)
  const grouped = {};
  for (const entry of relevantEntries.values()) {
    if (entry.type === "Instructions") continue;
    if (entry.type === "Memory") continue;
    if (!grouped[entry.type]) grouped[entry.type] = [];
    grouped[entry.type].push(entry);
  }

  let out = "## CONTEXT:\n";
  if (Object.keys(grouped).length === 0 && !memoryContent) {
    out += "(No relevant bible context)\n";
  } else {
    // Memory first
    if (memoryContent) {
      out += "### Story so far\n" + memoryContent + "\n\n";
    }

    // Other types in priority order
    const priorityOrder = ["Chapter Outline"];
    const otherTypes = Object.keys(grouped).filter(
      (t) => !priorityOrder.includes(t)
    );
    const orderedTypes = [
      ...priorityOrder.filter((t) => grouped[t]),
      ...otherTypes,
    ];

    for (const type of orderedTypes) {
      if (!grouped[type]) continue;
      out += `### ${type}\n`;
      for (const entry of grouped[type]) {
        out += `#### ${entry.title}: ${entry.content}\n\n`;
      }
      out += `\n\n`;
    }
  }
  out += "\n\n";

  const customInstructions = "";

  return {
    contextString: out.trim(),
    customInstructions,
    includedEntries: Array.from(relevantEntries.values()).filter(
      (e) => e.type !== "Instructions"
    ),
  };
}
