import type { OrganizerDB } from "./db";
import type { ChatAssignment, Folder, OrganizerSettings } from "../domain/types";

export interface OrganizerRepository {
    loadOrganizerData: () => Promise<{
        folders: Folder[];
        assignments: ChatAssignment[];
        settings: OrganizerSettings;
    }>;
    saveFolder: (folder: Folder) => Promise<void>;
    deleteFolder: (folderId: string) => Promise<void>;
    saveAssignment: (assignment: ChatAssignment) => Promise<void>;
    deleteAssignment: (chatId: string) => Promise<void>;
    saveSettings: (settings: OrganizerSettings) => Promise<void>;
    close: () => void;
}

export function createOrganizerRepository(db: OrganizerDB): OrganizerRepository {
    return {
        async loadOrganizerData() {
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
        },

        async saveFolder(folder) {
            await db.folders.put(folder);
        },

        async deleteFolder(folderId) {
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
        },

        async saveAssignment(assignment) {
            await db.assignments.put(assignment);
        },

        async deleteAssignment(chatId) {
            await db.assignments.delete(chatId);
        },

        async saveSettings(settings) {
            await db.settings.put(settings);
        },

        close() {
            db.close();
        },
    };
}
