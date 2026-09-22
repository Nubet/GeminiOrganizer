import Dexie, { type Table } from "dexie";
import type { ChatAssignment, Folder, OrganizerSettings } from "../domain/types";

class OrganizerDB extends Dexie {
    folders!: Table<Folder, string>;
    assignments!: Table<ChatAssignment, string>;
    settings!: Table<OrganizerSettings, string>;

    constructor() {
        super("gemini-organizer");

        this.version(1).stores({
            folders: "id, parentId, position, updatedAt",
            assignments: "chatId, folderId, updatedAt",
            settings: "id",
        });
    }
}

export const db = new OrganizerDB();
