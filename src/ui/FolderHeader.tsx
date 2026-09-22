import type { Folder } from "../domain/types";
import type { FolderChanges } from "../services/organizer-service";

interface FolderHeaderProps {
    folder: Folder;
    onAddFolder: (parentId: string | null) => Promise<void>;
    onUpdateFolder: (folderId: string, changes: FolderChanges) => Promise<void>;
    onDeleteFolder: (folderId: string) => Promise<void>;
}

export function FolderHeader({ folder, onAddFolder, onUpdateFolder, onDeleteFolder }: FolderHeaderProps) {
    return (
        <div
            class="go-folder-header"
            onClick={() => onUpdateFolder(folder.id, { isExpanded: !folder.isExpanded })}
        >
            <div class="go-folder-chevron">▶</div>
            <div class="go-folder-color-wrap" onClick={(event) => event.stopPropagation()}>
                <button
                    type="button"
                    class="go-folder-dot"
                    title="Change folder color"
                    style={{ backgroundColor: folder.color }}
                />
                <input
                    type="color"
                    class="go-folder-color"
                    value={folder.color}
                    aria-label="Change folder color"
                    onInput={(event) => onUpdateFolder(folder.id, { color: event.currentTarget.value })}
                />
            </div>
            <input
                type="text"
                class="go-folder-name"
                value={folder.name}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => onUpdateFolder(folder.id, { name: event.currentTarget.value })}
            />
            <button
                type="button"
                class="go-folder-add-sub"
                title="Create sub-folder"
                onClick={(event) => {
                    event.stopPropagation();
                    void onAddFolder(folder.id);
                }}
            >
                +
            </button>
            <button
                type="button"
                class="go-folder-delete"
                title="Delete folder"
                onClick={(event) => {
                    event.stopPropagation();
                    void onDeleteFolder(folder.id);
                }}
            >
                ×
            </button>
        </div>
    );
}
