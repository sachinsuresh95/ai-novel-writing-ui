class Vectorizer {
  constructor() {
    this.worker = new Worker(
      new URL("./vectorizer.worker.js", import.meta.url),
      {
        type: "module",
      }
    );
    this.queue = [];
    this.worker.onmessage = (event) => {
      const oldestPendingRequest = this.queue.shift();
      if (oldestPendingRequest) {
        oldestPendingRequest.resolve(new Float32Array(event.data));
      }
    };
  }

  generateEmbedding(text) {
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.worker.postMessage({ text });
    });
  }
}

const vectorizer = new Vectorizer();
export default vectorizer;
