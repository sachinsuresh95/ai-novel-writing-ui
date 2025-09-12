import vectorizer from "./vectorizer";
import { getAllEmbeddings } from "../storage";

/**
 * Calculates the cosine similarity between two vectors.
 *
 * @param {number[]} vecA - The first vector.
 * @param {number[]} vecB - The second vector.
 * @returns {number} The cosine similarity score.
 */
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Finds the most similar entries to a given query text.
 *
 * @param {string} queryText - The text to search for.
 * @param {number} [topK=5] - The number of top results to return.
 * @returns {Promise<Array<{entryId: string, score: number}>>} The top K similar entries.
 */
async function findSimilarEntries(queryText, topK = 5) {
  if (!queryText.trim()) {
    return [];
  }

  const queryEmbedding = await vectorizer.generateEmbedding(queryText);
  const allEmbeddings = await getAllEmbeddings();

  const similarities = allEmbeddings.map((entry) => ({
    entryId: entry.entryId,
    score: cosineSimilarity(queryEmbedding, entry.embedding),
  }));

  similarities.sort((a, b) => b.score - a.score);

  return similarities.slice(0, topK);
}

export default findSimilarEntries;
