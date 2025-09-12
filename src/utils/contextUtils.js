// src/utils/contextUtils.js
import { encode, decode } from "gpt-tokenizer";
import {
  extractStoryContext,
  extractBibleContext,
  extractSelectiveBibleContext,
} from "../context-extractor";

// Tokenization helpers (extracted from usePromptContextManager)
const textToTokens = (text = "") => {
  if (!text) return [];
  return encode(text);
};

const tokensToText = (tokens = []) => {
  if (!tokens.length) return "";
  return decode(tokens);
};

const truncateTokens = (tokens, maxTokens, from = "end") => {
  if (tokens.length <= maxTokens) {
    return tokens;
  }
  if (from === "end") {
    return tokens.slice(-maxTokens);
  }
  return tokens.slice(0, maxTokens);
};

// 1. calculateTokenBudget function
export const calculateTokenBudget = (
  customInstruction,
  selected,
  modelContextWindow,
  maxTokens
) => {
  const contextWindowSize = modelContextWindow || 8192;
  const generationTokens = Number(maxTokens) || 1024;
  const promptTokenBudget = contextWindowSize - generationTokens;

  let fixedTokenCount = 0;
  fixedTokenCount += 200; //estimated system prompt fixed length - without replaced content
  fixedTokenCount += textToTokens(customInstruction).length;
  fixedTokenCount += textToTokens(selected).length;
  fixedTokenCount += 250; // Overhead for safety

  const variableTokenBudget = Math.max(0, promptTokenBudget - fixedTokenCount);
  return { fixedTokenCount, variableTokenBudget, promptTokenBudget };
};

// 2. truncateContexts function
export const truncateContexts = (
  bibleContext,
  precedingText,
  followingText,
  variableTokenBudget
) => {
  // Tokenize all variable context elements
  const bibleTokens = textToTokens(bibleContext);
  const precedingTokens = textToTokens(precedingText);
  const followingTokens = textToTokens(followingText);

  // Calculate total tokens and determine allocation shares
  const totalVariableTokens =
    bibleTokens.length + precedingTokens.length + followingTokens.length;

  const bibleShare =
    totalVariableTokens > 0 ? bibleTokens.length / totalVariableTokens : 0.5;
  const precedingShare =
    totalVariableTokens > 0
      ? precedingTokens.length / totalVariableTokens
      : 0.35;
  const followingShare =
    totalVariableTokens > 0
      ? followingTokens.length / totalVariableTokens
      : 0.15;

  // Allocate budget according to shares
  const bibleTokenAllocation = Math.floor(variableTokenBudget * bibleShare);
  const precedingTokenAllocation = Math.floor(
    variableTokenBudget * precedingShare
  );
  const followingTokenAllocation = Math.floor(
    variableTokenBudget * followingShare
  );

  // Truncate based on allocation
  const truncatedBibleTokens = truncateTokens(
    bibleTokens,
    bibleTokenAllocation,
    "start"
  );
  const truncatedPrecedingTokens = truncateTokens(
    precedingTokens,
    precedingTokenAllocation,
    "end"
  );
  const truncatedFollowingTokens = truncateTokens(
    followingTokens,
    followingTokenAllocation,
    "start"
  );

  // Decode back to strings
  return {
    truncatedBibleContext: tokensToText(truncatedBibleTokens),
    truncatedPrecedingText: tokensToText(truncatedPrecedingTokens),
    truncatedFollowingText: tokensToText(truncatedFollowingTokens),
  };
};

// 3. computeGenerationContext function (async due to selective extraction)
export const computeGenerationContext = async ({
  activeItem,
  selection,
  activeSidebarTab,
  documents,
  activeDocumentId,
  bibleEntries,
  activeBibleEntryId,
  customInstruction = "",
  selectedText = "",
  modelContextWindow,
  maxTokens,
}) => {
  // 1. Extract story context (lightweight, sync)
  const { preceding, following, selected } = extractStoryContext(
    activeItem,
    selection
  );

  // 2. Extract Bible context based on tab
  let bibleContext = "",
    bibleEntriesForLog = [];
  if (activeSidebarTab === "outline") {
    const doc = documents?.find((d) => d.id === activeDocumentId);
    const storyTextForAnalysis = `${preceding?.slice(
      -2000
    )} ${selected} ${following?.slice(0, 1000)}`;
    const result = await extractSelectiveBibleContext(
      bibleEntries,
      storyTextForAnalysis,
      doc?.title || "",
      customInstruction
    );
    bibleContext = result.contextString || "";
    bibleEntriesForLog = result.includedEntries || [];
  } else {
    const result = extractBibleContext(bibleEntries, activeBibleEntryId);
    bibleContext = result.contextString || "";
    bibleEntriesForLog = result.includedEntries || [];
  }

  // 3. Calculate token budget
  const tokenBudget = calculateTokenBudget(
    customInstruction,
    selectedText || selected,
    modelContextWindow,
    maxTokens
  );
  const { variableTokenBudget } = tokenBudget;

  // 4. Truncate contexts
  const truncations = truncateContexts(
    bibleContext,
    preceding,
    following,
    variableTokenBudget
  );

  return {
    bibleContext,
    bibleEntriesForLog,
    preceding,
    following,
    selected,
    ...truncations,
    ...tokenBudget,
  };
};
