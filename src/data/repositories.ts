import { db } from "./db";
import type { ChatAssignment, Folder, OrganizerSettings } from "../domain/types";

export async function loadOrganizerData() {
    const [folders, assignments, settings] = await Promise.all([
        db.folders.toArray(),
        db.assignments.toArray(),
        db.settings.get("main"),
    ]);

    return {
        folders: folders.sort((a, b) => a.position - b.position),
        assignments,
        settings: settings ?? { id: "main", foldersVisible: true },
    };
}

export async function saveFolder(folder: Folder): Promise<void> {
    await db.folders.put(folder);
}

export async function deleteFolder(folderId: string): Promise<void> {
    await db.transaction("rw", db.folders, db.assignments, async () => {
        const folders = await db.folders.toArray();
        const ids = new Set([folderId]);
        let changed = true;

        while (changed) {
            changed = false;
            for (const folder of folders) {
                if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
                    ids.add(folder.id);
                    changed = true;
                }
            }
        }

        await db.folders.bulkDelete([...ids]);
        await db.assignments.where("folderId").anyOf([...ids]).delete();
    });
}

export async function saveAssignment(assignment: ChatAssignment): Promise<void> {
    await db.assignments.put(assignment);
}

export async function deleteAssignment(chatId: string): Promise<void> {
    await db.assignments.delete(chatId);
}

export async function saveSettings(settings: OrganizerSettings): Promise<void> {
    await db.settings.put(settings);
}
