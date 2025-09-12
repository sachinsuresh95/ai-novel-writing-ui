import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;

class EmbeddingPipeline {
  static instance = null;
  static async getInstance() {
    if (this.instance === null) {
      this.instance = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
      );
    }
    return this.instance;
  }
}

self.onmessage = async (event) => {
  const vectorizer = await EmbeddingPipeline.getInstance();
  const result = await vectorizer(event.data.text, {
    pooling: "mean",
    normalize: true,
  });
  self.postMessage(result.data, [result.data.buffer]);
};
