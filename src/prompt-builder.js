import { PromptContextHelpers } from "./hooks/usePromptContextManager";

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
}) {
  // 1. System Prompt & User Instruction
  const systemPrompt = `You are a world-class writing partner, an expert in narrative structure, character development, and prose. Your goal is to assist a writer by generating content that is stylistically and tonally consistent with their work. You will be given context from their "Story Bible" and the surrounding text. Your response should be focused, directly addressing the user's request without preamble.`;
  const userInstruction = instruction
    ? `\nUSER INSTRUCTION: "${instruction}"`
    : "";

  // 2. Message Construction
  const messages = [];
  if (truncatedBibleContext) {
    messages.push({
      role: "user",
      content: `CONTEXT: STORY BIBLE\n---\n${truncatedBibleContext}`,
    });
    messages.push({ role: "assistant", content: "Bible context noted." });
  }

  const effectivePrecedingText =
    mode === "write"
      ? truncatedPrecedingText + cardContent
      : truncatedPrecedingText;

  const isOutline = activeSidebarTab === "outline";

  if (isOutline) {
    // --- OUTLINE/MANUSCRIPT PROMPTS ---
    if (mode !== "write") {
      if (effectivePrecedingText) {
        messages.push({
          role: "user",
          content: `CONTEXT: PRECEDING TEXT\n---\n...${effectivePrecedingText}`,
        });
        messages.push({ role: "assistant", content: "Preceding text noted." });
      }
      if (truncatedFollowingText) {
        messages.push({
          role: "user",
          content: `CONTEXT: FOLLOWING TEXT\n---\n${truncatedFollowingText}...`,
        });
        messages.push({ role: "assistant", content: "Following text noted." });
      }
    }

    switch (mode) {
      case "write":
        messages.push({
          role: "user",
          content: `TASK: Continue writing exactly from where the text ends. Do not repeat any of the provided text. Match the existing style, tone, and voice. If there is no text to continue, assume you're starting a new chapter. ${userInstruction}\n\nHere is the text to continue from:\n---\n...${effectivePrecedingText}`,
        });
        break;
      case "rewrite":
        if (!selectedText) return { error: "Select text to rewrite." };
        messages.push({
          role: "user",
          content: `TASK: Rewrite the following selected text. ${userInstruction}\n\nSELECTED TEXT:\n---\n${selectedText}`,
        });
        break;
      case "describe":
        if (!selectedText) return { error: "Select text to describe." };
        messages.push({
          role: "user",
          content: `TASK: Expand upon the following selected text, adding rich sensory details and description. Do not advance the plot. ${userInstruction}\n\nSELECTED TEXT:\n---\n${selectedText}`,
        });
        break;
      case "brainstorm":
        messages.push({
          role: "user",
          content: `TASK: Brainstorm a list of creative ideas for what could happen next, based on the story so far. ${userInstruction}. Respond like a novel writing assistant, with engaging suggestions and ideas.`,
        });
        break;
      default:
        return { error: "Invalid mode." };
    }
  } else {
    // --- BIBLE PROMPTS ---
    if (!bible) return { error: "No active bible entry." };

    if (mode !== "write") {
      if (effectivePrecedingText) {
        messages.push({
          role: "user",
          content: `CONTEXT: PRECEDING TEXT IN ENTRY\n---\n...${effectivePrecedingText}`,
        });
        messages.push({
          role: "assistant",
          content: "Preceding text noted.",
        });
      }
      if (truncatedFollowingText) {
        messages.push({
          role: "user",
          content: `CONTEXT: FOLLOWING TEXT IN ENTRY\n---\n${truncatedFollowingText}...`,
        });
        messages.push({
          role: "assistant",
          content: "Following text noted.",
        });
      }
    }

    switch (mode) {
      case "write":
        messages.push({
          role: "user",
          content: `TASK: You are writing in a Story Bible entry titled "${bible.title}" (Type: ${bible.type}). Continue writing exactly from where the text ends. Do not repeat any of the provided text. Match the existing style. ${userInstruction}\n\nHere is the text to continue from:\n---\n...${effectivePrecedingText}`,
        });
        break;
      case "rewrite":
        const textToRewrite = selectedText || bible.content;
        if (!textToRewrite) return { error: "No content to rewrite." };
        const rewriteTarget = selectedText
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

  return { systemPrompt, messages };
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

  const userPrompt = `${userInstruction}

CHAPTER CONTENT:
---
${truncatedContent}
---`;

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
  const { maxTokens, generationSettings, ...rest } = options;
  const result = buildAdvancedPrompt(rest);

  if (result.error) return { error: result.error };

  const { systemPrompt, messages } = result;

  const body = {
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    max_tokens: Number(maxTokens),
    ...generationSettings,
  };

  const promptForHistory = body.messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  // Note: bibleEntriesForLog is removed as the parent component now manages this.
  return { body, promptForHistory };
};
