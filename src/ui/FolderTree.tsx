import type { ChatAssignment, Folder, GeminiChat } from "../domain/types";
import { childrenOf } from "../domain/tree";
import type { FolderChanges } from "../services/organizer-service";
import { FolderView } from "./Folder";

interface FolderTreeProps {
    folders: Folder[];
    assignments: ChatAssignment[];
    chatById: Map<string, GeminiChat>;
    onAddFolder: (parentId: string | null) => Promise<void>;
    onUpdateFolder: (folderId: string, changes: FolderChanges) => Promise<void>;
    onDeleteFolder: (folderId: string) => Promise<void>;
    onAssignChat: (chatId: string, folderId: string) => Promise<void>;
    onUnassignChat: (chatId: string) => Promise<void>;
}

export function FolderTree({
    folders,
    assignments,
    chatById,
    onAddFolder,
    onUpdateFolder,
    onDeleteFolder,
    onAssignChat,
    onUnassignChat,
}: FolderTreeProps) {
    return (
        <div class="go-folder-tree">
            {childrenOf(folders, null).map((folder) => (
                <FolderView
                    key={folder.id}
                    folder={folder}
                    children={childrenOf(folders, folder.id)}
                    assignments={assignments}
                    chatById={chatById}
                    folders={folders}
                    onAddFolder={onAddFolder}
                    onUpdateFolder={onUpdateFolder}
                    onDeleteFolder={onDeleteFolder}
                    onAssignChat={onAssignChat}
                    onUnassignChat={onUnassignChat}
                />
            ))}
        </div>
    );
}
