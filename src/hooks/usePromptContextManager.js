import { encode, decode } from "gpt-tokenizer";
import { useMemo } from "react";

/**
 * Encodes text to tokens.
 * @param {string} text The text to encode.
 * @returns {number[]} Array of tokens.
 */
const textToTokens = (text = "") => {
  if (!text) return [];
  return encode(text);
};

/**
 * Decodes tokens to text.
 * @param {number[]} tokens The tokens to decode.
 * @returns {string} The decoded text.
 */
const tokensToText = (tokens = []) => {
  if (!tokens.length) return "";
  return decode(tokens);
};

/**
 * Truncates an array of tokens to a maximum length.
 * @param {number[]} tokens The array of tokens to truncate.
 * @param {number} maxTokens The maximum number of tokens to keep.
 * @param {'start' | 'end'} from Where to truncate from. 'start' keeps the beginning, 'end' keeps the end.
 * @returns {number[]} The truncated array of tokens.
 */
const truncateTokens = (tokens, maxTokens, from = "end") => {
  if (tokens.length <= maxTokens) {
    return tokens;
  }
  if (from === "end") {
    return tokens.slice(-maxTokens);
  }
  return tokens.slice(0, maxTokens);
};

export const usePromptContextManager = ({
  bibleContext,
  precedingText,
  followingText,
  promptTokenBudget,
}) => {
  const context = useMemo(() => {
    // 1. Tokenize all the variable context elements
    const bibleTokens = textToTokens(bibleContext);
    const precedingTokens = textToTokens(precedingText);
    const followingTokens = textToTokens(followingText);

    // 2. Calculate the total tokens and determine allocation shares
    const totalVariableTokens =
      bibleTokens.length + precedingTokens.length + followingTokens.length;

    // Proportional allocation: Give more space to the largest contexts.
    // Defaults are used if total is zero to avoid division by zero.
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

    // 3. Allocate the prompt budget according to the shares
    const bibleTokenAllocation = Math.floor(promptTokenBudget * bibleShare);
    const precedingTokenAllocation = Math.floor(
      promptTokenBudget * precedingShare
    );
    const followingTokenAllocation = Math.floor(
      promptTokenBudget * followingShare
    );

    // 4. Truncate the token arrays based on their allocation
    const truncatedBibleTokens = truncateTokens(
      bibleTokens,
      bibleTokenAllocation,
      "start" // Keep the most recent/relevant parts of the bible
    );
    const truncatedPrecedingTokens = truncateTokens(
      precedingTokens,
      precedingTokenAllocation,
      "end" // Keep the text immediately preceding the cursor
    );
    const truncatedFollowingTokens = truncateTokens(
      followingTokens,
      followingTokenAllocation,
      "start" // Keep the text immediately following the cursor
    );

    console.log("in context manager: ", { precedingText, followingText });

    // 5. Decode the truncated token arrays back to strings
    return {
      truncatedBibleContext: tokensToText(truncatedBibleTokens),
      truncatedPrecedingText: tokensToText(truncatedPrecedingTokens),
      truncatedFollowingText: tokensToText(truncatedFollowingTokens),
    };
  }, [bibleContext, precedingText, followingText, promptTokenBudget]);

  return context;
};

// Also exporting these helpers for use in other parts of the app if needed
export const PromptContextHelpers = {
  textToTokens,
  tokensToText,
  truncateTokens,
};
