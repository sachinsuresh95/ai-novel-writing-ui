import { PromptContextHelpers } from "./hooks/usePromptContextManager";
import { extractCustomInstructions } from "./context-extractor"; // Import for custom instructions

function getBibleSubPrompt(bibleEntry) {
  const bibleType = bibleEntry?.type;
  const bibleTitle = bibleEntry?.title || "";
  if (!bibleType || !bibleTitle) return "";
  const basePrompt =
    "Keep the description concise and focused on the most critical information. ";

  switch (bibleType) {
    case "Character":
      return (
        basePrompt +
        `Flesh out the character's core personality, primary motivation, physical appearance, and key relationships. Character: ${bibleTitle}`
      );
    case "Plot Summary":
      return `Outline the main arcs, key turning points, and final resolution in a brief format. Do not exceed a few paragraphs.`;
    case "Setting":
      return (
        basePrompt +
        `Describe the ambience and key features of the location ${bibleTitle}. Focus on sensory details relevant to the story.`
      );
    case "Lore":
      return (
        basePrompt +
        `Detail a core aspect of your world's history, mythology, or magic system. Be specific and brief. Lore topic: ${bibleTitle}`
      );
    case "Chapter Outline":
      return `List the key scenes and plot points in a simple paragraph. Keep it concise. Chapter title: ${bibleTitle}`;
    case "Instructions":
      return ""; // No AI prompt for this type
    default:
      return `Write content that is concise and consistent with the entry's purpose. Entry title: ${bibleTitle} Entry type: ${bibleType}`;
  }
}
// Pass truncated context directly from the new hook
function buildAdvancedPrompt({
  mode,
  instruction,
  activeSidebarTab,
  bible, // Now passed in directly
  cardContent = "",
  truncatedBibleContext,
  truncatedPrecedingText,
  truncatedFollowingText,
  selectedText,
  bibleEntries, // Add bibleEntries for custom instructions
}) {
  // 1. System Prompt with Custom Instructions
  let systemPrompt = `You are a world-class writing partner, an expert in narrative structure, character development, and prose. Your goal is to assist a writer by generating content that is stylistically and tonally consistent with their work. You will be given context from their "Story Bible" and the surrounding text. Your response should be focused, directly addressing the user's request without preamble.`;

  // Extract and append custom instructions
  const customInstructions = bibleEntries
    ? extractCustomInstructions(bibleEntries)
    : "";
  if (customInstructions) {
    systemPrompt += `\n\n[CUSTOM_INSTRUCTIONS]\n${customInstructions}\n[/CUSTOM_INSTRUCTIONS]`;
  }

  // 2. Prepare sections
  const { truncateTokens, textToTokens, tokensToText } = PromptContextHelpers;
  const effectivePrecedingText =
    mode === "write"
      ? truncatedPrecedingText + cardContent
      : truncatedPrecedingText;

  // Truncate sections to manage tokens (preserve end for preceding)
  const maxSectionTokens = 1500; // Per section limit
  let bibleSection =
    truncatedBibleContext ||
    "[STORY_BIBLE]\n(No relevant bible context)\n[/STORY_BIBLE]";
  let precedingSection = effectivePrecedingText || "";
  let followingSection = truncatedFollowingText || "";
  let selectedSection = selectedText || "";

  // Truncate preceding (keep last part for continuation)
  if (precedingSection) {
    const precedingTokens = textToTokens(precedingSection);
    if (precedingTokens.length > maxSectionTokens) {
      const keepTokens = truncateTokens(
        precedingTokens,
        maxSectionTokens,
        "end"
      );
      precedingSection = tokensToText(keepTokens);
    }
  }

  // Similar truncation for others if needed
  if (followingSection) {
    const followingTokens = textToTokens(followingSection);
    if (followingTokens.length > maxSectionTokens) {
      const keepTokens = truncateTokens(
        followingTokens,
        maxSectionTokens,
        "start"
      );
      followingSection = tokensToText(keepTokens);
    }
  }

  if (selectedSection) {
    const selectedTokens = textToTokens(selectedSection);
    if (selectedTokens.length > maxSectionTokens) {
      const keepTokens = truncateTokens(
        selectedTokens,
        maxSectionTokens,
        "full"
      );
      selectedSection = tokensToText(keepTokens);
    }
  }

  const bibleSectionContent = `

${bibleSection}

[PRECEDING_TEXT]
${precedingSection}
[CONTINUE_FROM_HERE]

[FOLLOWING_TEXT] (for stylistic reference only - do not continue into this)
${followingSection}
[RESUME_HERE]

[USER_INSTRUCTIONS]
${instruction || "No specific user instructions provided."}
[/USER_INSTRUCTIONS]`;

  const isOutline = activeSidebarTab === "outline";
  let taskSection = "";

  if (isOutline) {
    // --- OUTLINE/MANUSCRIPT PROMPTS ---
    switch (mode) {
      case "write":
        taskSection = `
[TASK: WRITE MODE]
Write descriptive prose by expanding on the given chapter outline. Continue the given [PRECEDING_TEXT] seamlessly at [CONTINUE_FROM)HERE]. Do not repeat any provided text. Match the existing style, tone, and voice from [STORY_BIBLE] and surrounding text. If no text to continue, start a new chapter.
`;
        break;
      case "rewrite":
        if (!selectedText) return { error: "Select text to rewrite." };
        taskSection = `
[SELECTED_TEXT]
${selectedSection}
[/SELECTED_TEXT]

[TASK: REWRITE MODE]
Rewrite only the [SELECTED_TEXT], keeping it consistent with [STORY_BIBLE] and surrounding style. Do not advance the plot beyond the selection.
`;
        break;
      case "describe":
        if (!selectedText) return { error: "Select text to describe." };
        taskSection = `
[SELECTED_TEXT]
${selectedSection}
[/SELECTED_TEXT]

[TASK: DESCRIBE MODE]
Expand upon the [SELECTED_TEXT] by adding rich sensory details and description. Do not advance the plot. Stay consistent with [STORY_BIBLE].
`;
        break;
      case "brainstorm":
        taskSection = `
[TASK: BRAINSTORM MODE]
Brainstorm a list of creative ideas for what could happen next, based on [STORY_BIBLE] and [PRECEDING_TEXT]. Respond as a novel writing assistant with engaging suggestions.
`;
        break;
      default:
        return { error: "Invalid mode." };
    }
  } else {
    // --- BIBLE PROMPTS ---
    if (!bible) return { error: "No active bible entry." };
    if (bible.type === "Instructions")
      return { error: "AI tools are disabled for instructions." };

    const subPrompt = getBibleSubPrompt(bible);

    switch (mode) {
      case "write":
        taskSection = `
[TASK: WRITE MODE - BIBLE ENTRY]
${subPrompt} Continue writing for the "${bible.title}" entry seamlessly from [PRECEDING_TEXT] at [CONTINUE_FROM_HERE]. Do not repeat provided text. Match the existing style from [STORY_BIBLE].
`;
        break;
      case "rewrite":
        const textToRewrite = selectedText || bible.content;
        if (!textToRewrite) return { error: "No content to rewrite." };
        const rewriteTarget = selectedText
          ? "the selected text"
          : "the entire entry";
        taskSection = `
[SELECTED_TEXT]
${textToRewrite}
[/SELECTED_TEXT]

[TASK: REWRITE MODE - BIBLE ENTRY]
${subPrompt} Rewrite ${rewriteTarget} for the Story Bible entry titled "${bible.title}". Keep consistent with overall [STORY_BIBLE].
`;
        break;
      case "brainstorm":
        taskSection = `
[CURRENT_CONTENT]
${bible.content || "(This entry is currently empty)"}
[/CURRENT_CONTENT]

[TASK: BRAINSTORM MODE - BIBLE ENTRY]
${subPrompt} Brainstorm ideas for the Story Bible entry titled "${
          bible.title
        }". Base ideas on [CURRENT_CONTENT] and overall [STORY_BIBLE].
`;
        break;
      default:
        return { error: "Invalid mode for bible entry." };
    }
  }

  const userContent = bibleSectionContent + "\n\n" + taskSection;

  return { systemPrompt, userContent };
}

export function buildMemoryUpdatePrompt({
  chapterTitle,
  chapterContent,
  contextWindowSize = 4096, // Assume a smaller context for summarization
}) {
  const { textToTokens, tokensToText, truncateTokens } = PromptContextHelpers;

  const systemPrompt = `You are a summarization expert. Your task is to extract key events, key conversations, and memorable details from the chapter into a concise bullet list (max 6 points). Focus on important plot points, any new information about characters, or any interesting details. Write in the past tense from a neutral, omniscient perspective. This summary will be part of a larger "Memory" document.`;
  const userInstruction = `Summarize the following chapter, titled "${chapterTitle}". Respond with only the bullet list summary.`;
  const maxGenTokens = 500;

  // Calculate the available budget for the chapter content
  const promptTokenBudget = contextWindowSize - maxGenTokens;
  let fixedTokenCount = 0;
  fixedTokenCount += textToTokens(systemPrompt).length;
  fixedTokenCount += textToTokens(userInstruction).length;
  fixedTokenCount += 100; // Overhead for message structure

  const chapterContentBudget = Math.max(0, promptTokenBudget - fixedTokenCount);

  // Tokenize and truncate the chapter content
  const chapterTokens = textToTokens(chapterContent);
  const truncatedChapterTokens = truncateTokens(
    chapterTokens,
    chapterContentBudget,
    "start" // Keep the beginning of the chapter, as it often has key setup
  );
  const truncatedContent = tokensToText(truncatedChapterTokens);

  const userPrompt = `[CHAPTER_SUMMARY_TASK]
${userInstruction}

[CHAPTER_CONTENT]
---
${truncatedContent}
---
[/CHAPTER_CONTENT]`;

  const messages = [{ role: "user", content: userPrompt }];

  const body = {
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    max_tokens: maxGenTokens,
    temperature: 0.5,
  };

  return { body };
}

// --- Main Export ---
// This function remains the public API, but now takes the processed context.
export const buildPrompt = (options) => {
  const { maxTokens, ...rest } = options;
  const result = buildAdvancedPrompt(rest);

  if (result.error) return { error: result.error };

  const { systemPrompt, userContent } = result;

  const body = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    max_tokens: Number(maxTokens),
  };

  const promptForHistory = body.messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  return { body, promptForHistory };
};
