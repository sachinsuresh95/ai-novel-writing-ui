import { GENERATION_PRESETS } from "./constants";

// --- Advanced Context Extraction ---

function extractBibleContext(bibleEntries, excludeId = null) {
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

function extractStoryContext(doc, selectionRef) {
  if (!doc) return { preceding: "", following: "", selected: "" };
  const { start, end } = selectionRef.current || { start: 0, end: 0 };
  return {
    preceding: doc.content.slice(0, start),
    following: doc.content.slice(end),
    selected: doc.content.slice(start, end),
  };
}

function extractSelectiveBibleContext(
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
    const chapterTag = `<${chapterTitle} memory>`;
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

function buildAdvancedPrompt({
  mode,
  instruction,
  activeSidebarTab,
  documents,
  activeDocumentId,
  bibleEntries,
  activeBibleEntryId,
  selectionRef,
  cardContent = "", // Add new parameter for card content
}) {
  // 1. Context Extraction
  const isOutline = activeSidebarTab === "outline";
  const doc = isOutline
    ? documents?.find((d) => d.id === activeDocumentId)
    : null;
  const bible = !isOutline
    ? bibleEntries?.find((b) => b.id === activeBibleEntryId)
    : null;

  const activeContentSource = isOutline ? doc : bible;

  const {
    preceding = "",
    following = "",
    selected = "",
  } = activeContentSource
    ? extractStoryContext(activeContentSource, selectionRef)
    : {};
  const storyTextForAnalysis = `${preceding.slice(
    -2000
  )} ${selected} ${following.slice(0, 1000)}`;

  const { contextString: bibleContext, includedEntries: bibleEntriesForLog } =
    isOutline
      ? extractSelectiveBibleContext(
          bibleEntries,
          storyTextForAnalysis,
          doc?.title || ""
        )
      : extractBibleContext(bibleEntries, activeBibleEntryId);

  // 2. System Prompt
  const systemPrompt = `You are a world-class writing partner, an expert in narrative structure, character development, and prose. Your goal is to assist a writer by generating content that is stylistically and tonally consistent with their work. You will be given context from their "Story Bible" and the surrounding text. Your response should be focused, directly addressing the user's request without preamble.`;

  // 3. Message Construction
  const messages = [];
  if (bibleContext) {
    messages.push({
      role: "user",
      content: `CONTEXT: STORY BIBLE\n---\n${bibleContext}`,
    });
    messages.push({ role: "assistant", content: "Bible context noted." });
  }

  const userInstruction = instruction
    ? `\nUSER INSTRUCTION: "${instruction}"`
    : "";

  if (isOutline) {
    // --- OUTLINE/MANUSCRIPT PROMPTS ---
    // For 'write' mode, combine the document's preceding text with the content already in the card.
    const effectivePrecedingText =
      mode === "write" ? preceding + cardContent : preceding;

    // We no longer need to send preceding/following as separate context messages for the 'write' task,
    // as it's now part of the main task instruction.
    if (mode !== "write") {
      if (effectivePrecedingText) {
        messages.push({
          role: "user",
          content: `CONTEXT: PRECEDING TEXT\n---\n...${effectivePrecedingText.slice(
            -4000
          )}`, // Increased context
        });
        messages.push({ role: "assistant", content: "Preceding text noted." });
      }
      if (following) {
        messages.push({
          role: "user",
          content: `CONTEXT: FOLLOWING TEXT\n---\n${following.slice(
            0,
            1000
          )}...`,
        });
        messages.push({ role: "assistant", content: "Following text noted." });
      }
    }

    switch (mode) {
      case "write":
        messages.push({
          role: "user",
          content: `TASK: Continue writing exactly from where the text ends. Do not repeat any of the provided text. Match the existing style, tone, and voice. ${userInstruction}\n\nHere is the text to continue from:\n---\n...${effectivePrecedingText.slice(
            -4000
          )}`,
        });
        break;
      case "rewrite":
        if (!selected) return { error: "Select text to rewrite." };
        messages.push({
          role: "user",
          content: `TASK: Rewrite the following selected text. ${userInstruction}\n\nSELECTED TEXT:\n---\n${selected}`,
        });
        break;
      case "describe":
        if (!selected) return { error: "Select text to describe." };
        messages.push({
          role: "user",
          content: `TASK: Expand upon the following selected text, adding rich sensory details and description. Do not advance the plot. ${userInstruction}\n\nSELECTED TEXT:\n---\n${selected}`,
        });
        break;
      case "brainstorm":
        messages.push({
          role: "user",
          content: `TASK: Brainstorm a list of creative ideas for what could happen next, based on the story so far. ${userInstruction}`,
        });
        break;
      default:
        return { error: "Invalid mode." };
    }
  } else {
    // --- BIBLE PROMPTS ---
    if (!bible) return { error: "No active bible entry." };

    const effectivePrecedingText =
      mode === "write" ? preceding + cardContent : preceding;

    // Add preceding/following context for modes other than 'write'
    if (mode !== "write") {
      if (effectivePrecedingText) {
        messages.push({
          role: "user",
          content: `CONTEXT: PRECEDING TEXT IN ENTRY\n---\n...${effectivePrecedingText.slice(
            -4000
          )}`,
        });
        messages.push({ role: "assistant", content: "Preceding text noted." });
      }
      if (following) {
        messages.push({
          role: "user",
          content: `CONTEXT: FOLLOWING TEXT IN ENTRY\n---\n${following.slice(
            0,
            1000
          )}...`,
        });
        messages.push({ role: "assistant", content: "Following text noted." });
      }
    }

    switch (mode) {
      case "write":
        messages.push({
          role: "user",
          content: `TASK: You are writing in a Story Bible entry titled "${
            bible.title
          }" (Type: ${
            bible.type
          }). Continue writing exactly from where the text ends. Do not repeat any of the provided text. Match the existing style. ${userInstruction}\n\nHere is the text to continue from:\n---\n...${effectivePrecedingText.slice(
            -4000
          )}`,
        });
        break;
      case "rewrite":
        const textToRewrite = selected || bible.content;
        if (!textToRewrite) return { error: "No content to rewrite." };
        const rewriteTarget = selected
          ? "the selected text"
          : "the entire entry";
        messages.push({
          role: "user",
          content: `TASK: Rewrite ${rewriteTarget} for the Story Bible entry titled "${bible.title}" (Type: ${bible.type}). ${userInstruction}\n\nTEXT TO REWRITE:\n---\n${textToRewrite}`,
        });
        break;
      case "brainstorm":
        messages.push({
          role: "user",
          content: `TASK: Brainstorm ideas for the Story Bible entry titled "${
            bible.title
          }" (Type: ${
            bible.type
          }). Base your ideas on the current content if it exists. ${userInstruction}\n\nCURRENT CONTENT:\n---\n${
            bible.content || "(This entry is currently empty)"
          }`,
        });
        break;
      default:
        return { error: "Invalid mode for bible entry." };
    }
  }

  return { systemPrompt, messages, bibleEntriesForLog };
}

export function buildMemoryUpdatePrompt(chapterTitle, chapterContent) {
  const systemPrompt = `You are a summarization expert. Your task is to extract key events, key conversations, memorable details from the chapter into a concise bullet list of maximum 6 points, so choose only most important events, conversations and details. Try to include any quirks/details that are revealed in the chapter. Like a tattoo, or a kink, or a past event, or anything that might be considered interesting detail. It should be written in the past tense, from a neutral, omniscient perspective. This summary will be part of a larger "Memory" document that tracks the story's timeline.`;

  const userPrompt = `Please summarize the following chapter, titled "${chapterTitle}".

CHAPTER CONTENT:
---
${chapterContent}
---

Respond with only the bullet list summary.`;

  const messages = [{ role: "user", content: userPrompt }];

  const body = {
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    max_tokens: 500, // Generous token limit for a summary
    temperature: 0.5, // Lower temperature for more factual summary
  };

  return { body };
}

// --- Main Export ---
export const buildPrompt = (options) => {
  const { maxTokens, generationPreset } = options;
  const result = buildAdvancedPrompt(options);
  if (result.error) return { error: result.error };

  const presetSettings =
    GENERATION_PRESETS[generationPreset] || GENERATION_PRESETS.balanced;

  const { systemPrompt, messages, bibleEntriesForLog } = result;

  const body = {
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    max_tokens: Number(maxTokens),
    ...presetSettings,
  };

  const promptForHistory = body.messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  return { body, promptForHistory, bibleEntriesForLog };
};
