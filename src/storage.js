import Dexie from "dexie";

export const db = new Dexie("NovelWriterDB");

db.version(1).stores({
  projects: "&id, name",
  embeddings: "&entryId",
});

db.version(2).stores({
  projects_v2: "&id, name",
  embeddings: "&entryId",
});

export async function getProject(id) {
  return db.projects_v2.get(id);
}

export async function saveProject(project) {
  return db.projects_v2.put(project);
}

export async function getAllProjects() {
  return db.projects_v2
    .toCollection()
    .toArray((items) => items.map(({ id, name }) => ({ id, name })));
}

export async function deleteProject(id) {
  return db.projects_v2.delete(id);
}

export async function saveEmbedding(entryId, embedding) {
  return db.embeddings.put({ entryId, embedding });
}

export async function getEmbedding(entryId) {
  return db.embeddings.get(entryId);
}

export async function deleteEmbedding(entryId) {
  return db.embeddings.delete(entryId);
}

export async function getAllEmbeddingKeys() {
  return db.embeddings.toCollection().keys();
}

export async function getAllEmbeddings() {
  return db.embeddings.toArray();
}

export default {
  db,
  getProject,
  saveProject,
  getAllProjects,
  deleteProject,
  saveEmbedding,
  getEmbedding,
  deleteEmbedding,
  getAllEmbeddingKeys,
  getAllEmbeddings,
};
