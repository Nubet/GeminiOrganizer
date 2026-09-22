import type { ChatAssignment, Folder, GeminiChat } from "../domain/types";
import type { FolderChanges } from "../services/organizer-service";
import { FolderHeader } from "./FolderHeader";
import { FolderChat } from "./FolderChat";

interface FolderProps {
    folder: Folder;
    children: Folder[];
    folders: Folder[];
    assignments: ChatAssignment[];
    chatById: Map<string, GeminiChat>;
    onAddFolder: (parentId: string | null) => Promise<void>;
    onUpdateFolder: (folderId: string, changes: FolderChanges) => Promise<void>;
    onDeleteFolder: (folderId: string) => Promise<void>;
    onAssignChat: (chatId: string, folderId: string) => Promise<void>;
    onUnassignChat: (chatId: string) => Promise<void>;
}

export function FolderView({
    folder,
    children,
    folders,
    assignments,
    chatById,
    onAddFolder,
    onUpdateFolder,
    onDeleteFolder,
    onAssignChat,
    onUnassignChat,
}: FolderProps) {
    const chatIds = assignments
        .filter((assignment) => assignment.folderId === folder.id)
        .map((assignment) => assignment.chatId);

    function handleDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget instanceof HTMLElement && event.currentTarget.classList.remove("drag-over");
        const chatId = event.dataTransfer?.getData("text/plain");
        if (chatId) void onAssignChat(chatId, folder.id);
    }

    return (
        <div
            class={`go-folder ${folder.isExpanded ? "expanded" : ""}`}
            data-id={folder.id}
            onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.classList.add("drag-over");
            }}
            onDragLeave={(event) => event.currentTarget.classList.remove("drag-over")}
            onDrop={handleDrop}
        >
            <FolderHeader
                folder={folder}
                onAddFolder={onAddFolder}
                onUpdateFolder={onUpdateFolder}
                onDeleteFolder={onDeleteFolder}
            />

            {folder.isExpanded && (
                <div class="go-folder-content">
                    {chatIds.map((chatId) => (
                        <FolderChat
                            key={chatId}
                            chatId={chatId}
                            chat={chatById.get(chatId)}
                            onUnassign={onUnassignChat}
                        />
                    ))}
                    <div class="go-subfolders">
                        {children.map((child) => (
                            <FolderView
                                key={child.id}
                                folder={child}
                                children={folders.filter((item) => item.parentId === child.id).sort((a, b) => a.position - b.position)}
                                folders={folders}
                                assignments={assignments}
                                chatById={chatById}
                                onAddFolder={onAddFolder}
                                onUpdateFolder={onUpdateFolder}
                                onDeleteFolder={onDeleteFolder}
                                onAssignChat={onAssignChat}
                                onUnassignChat={onUnassignChat}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
