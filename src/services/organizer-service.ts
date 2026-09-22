import { createId } from "../domain/ids";
import { FOLDER_COLORS, type ChatAssignment, type Folder, type OrganizerData } from "../domain/types";
import {
    deleteAssignment,
    deleteFolder,
    saveAssignment,
    saveFolder,
    saveSettings,
} from "../data/repositories";

export type FolderChanges = Partial<Pick<Folder, "name" | "color" | "isExpanded">>;

function nextColor(folders: Folder[]): string {
    const used = new Set(folders.map((folder) => folder.color));
    return FOLDER_COLORS.find((color) => !used.has(color)) ?? FOLDER_COLORS[0];
}

export async function createFolder(
    data: OrganizerData,
    parentId: string | null,
): Promise<Folder> {
    const now = Date.now();
    const siblings = data.folders.filter((folder) => folder.parentId === parentId);
    const folder: Folder = {
        id: createId("folder"),
        parentId,
        name: parentId ? "New Sub-folder" : "New Folder",
        color: nextColor(data.folders),
        position: siblings.length,
        isExpanded: true,
        createdAt: now,
        updatedAt: now,
    };

    await saveFolder(folder);
    return folder;
}

export async function updateFolder(
    folder: Folder,
    changes: FolderChanges,
): Promise<Folder> {
    const updated = { ...folder, ...changes, updatedAt: Date.now() };
    await saveFolder(updated);
    return updated;
}

export async function removeFolder(data: OrganizerData, folderId: string): Promise<OrganizerData> {
    await deleteFolder(folderId);
    const ids = new Set([folderId]);
    let changed = true;

    while (changed) {
        changed = false;
        for (const folder of data.folders) {
            if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
                ids.add(folder.id);
                changed = true;
            }
        }
    }

    return {
        ...data,
        folders: data.folders.filter((folder) => !ids.has(folder.id)),
        assignments: data.assignments.filter((assignment) => !ids.has(assignment.folderId)),
    };
}

export async function assignChat(
    data: OrganizerData,
    chatId: string,
    folderId: string,
): Promise<OrganizerData> {
    const now = Date.now();
    const current = data.assignments.find((assignment) => assignment.chatId === chatId);
    const assignment: ChatAssignment = {
        chatId,
        folderId,
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
    };

    await saveAssignment(assignment);
    return {
        ...data,
        assignments: [
            ...data.assignments.filter((item) => item.chatId !== chatId),
            assignment,
        ],
        folders: data.folders.map((folder) =>
            folder.id === folderId ? { ...folder, isExpanded: true } : folder,
        ),
    };
}

export async function unassignChat(data: OrganizerData, chatId: string): Promise<OrganizerData> {
    await deleteAssignment(chatId);
    return {
        ...data,
        assignments: data.assignments.filter((assignment) => assignment.chatId !== chatId),
    };
}

export async function setFoldersVisible(
    data: OrganizerData,
    foldersVisible: boolean,
): Promise<OrganizerData> {
    const settings = { id: "main" as const, foldersVisible };
    await saveSettings(settings);
    return { ...data, settings };
}
