import type { Folder } from "./types";

export function childrenOf(folders: Folder[], parentId: string | null): Folder[] {
    return folders
        .filter((folder) => folder.parentId === parentId)
        .sort((a, b) => a.position - b.position);
}
