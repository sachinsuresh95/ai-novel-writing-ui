import { db } from "./storage";

export async function getProjectsForMigration() {
  const oldProjectsTableExists = await db
    .table("projects")
    .count()
    .then(() => true)
    .catch(() => false);

  if (!oldProjectsTableExists) {
    return [];
  }

  const projectsToMigrate = await db.table("projects").toArray();
  return projectsToMigrate;
}

export async function migrateProject(oldProject) {
  try {
    const newProject = {
      ...oldProject,
      // createdAt: new Date(),
      // updatedAt: new Date(),
    };

    await db.table("projects_v2").put(newProject);
    console.log(`Successfully migrated project ${oldProject.id}`);
  } catch (error) {
    console.error(`Failed to migrate project ${oldProject.id}:`, error);
  }
}

export async function runMigration() {
  console.log("Starting migration...");
  const projectsToMigrate = await getProjectsForMigration();

  if (projectsToMigrate.length > 0) {
    window.alert(
      "Your projects are being migrated to new schema. The app may be unresponsive for a moment."
    );
    for (const project of projectsToMigrate) {
      console.log(`Migrating project ${project.id}...`);
      await migrateProject(project);
    }

    console.log("Deleting old projects table...");
    await db.table("projects").toCollection().delete();
    console.log("Old projects table deleted.");
    window.alert("Migration complete.");
    window.location.reload();
  }

  console.log("Migration complete.");
}
