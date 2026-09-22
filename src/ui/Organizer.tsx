import { useRef, useState } from "preact/hooks";
import type { GeminiChat, OrganizerData } from "../domain/types";
import {
    assignChat,
    createFolder,
    removeFolder,
    setFoldersVisible,
    unassignChat,
    updateFolder,
} from "../services/organizer-service";
import { useMountEffect } from "./use-mount-effect";
import { FolderTree } from "./FolderTree";

interface OrganizerProps {
    initialData: OrganizerData;
    chats: GeminiChat[];
    onDataChange: (data: OrganizerData) => void;
}

export function Organizer({ initialData, chats, onDataChange }: OrganizerProps) {
    const [data, setData] = useState(initialData);
    const dataRef = useRef(data);
    dataRef.current = data;
    const chatById = new Map(chats.map((chat) => [chat.id, chat]));

    useMountEffect(() => {
        const createRootFolder = () => {
            void addFolder(null);
        };
        const unassign = (event: Event) => {
            const chatId = (event as CustomEvent<string>).detail;
            if (chatId) void apply(unassignChat(dataRef.current, chatId));
        };

        window.addEventListener("gemini-organizer-create-root-folder", createRootFolder);
        window.addEventListener("gemini-organizer-unassign-chat", unassign);
        return () => {
            window.removeEventListener("gemini-organizer-create-root-folder", createRootFolder);
            window.removeEventListener("gemini-organizer-unassign-chat", unassign);
        };
    });

    async function apply(operation: Promise<OrganizerData>): Promise<void> {
        const next = await operation;
        setData(next);
        onDataChange(next);
    }

    async function addFolder(parentId: string | null): Promise<void> {
        const currentData = dataRef.current;
        const folder = await createFolder(currentData, parentId);
        const next = {
            ...currentData,
            folders: [...currentData.folders, folder],
        };
        setData(next);
        onDataChange(next);
    }

    async function changeFolder(folderId: string, changes: Parameters<typeof updateFolder>[1]): Promise<void> {
        const folder = data.folders.find((item) => item.id === folderId);
        if (!folder) return;
        const updated = await updateFolder(folder, changes);
        const next = {
            ...data,
            folders: data.folders.map((item) => (item.id === folderId ? updated : item)),
        };
        setData(next);
        onDataChange(next);
    }

    async function deleteFolder(folderId: string): Promise<void> {
        if (!confirm("Delete this folder? (Chats will return to the main list)")) return;
        const next = await removeFolder(data, folderId);
        setData(next);
        onDataChange(next);
    }

    return (
        <div class="gemini-organizer-container">
            <div class="go-toolbar">
                <span class="go-toolbar-title">Folders</span>
                <button
                    type="button"
                    class="go-toolbar-toggle"
                    aria-label={data.settings.foldersVisible ? "Hide folders" : "Show folders"}
                    onClick={() => apply(setFoldersVisible(data, !data.settings.foldersVisible))}
                >
                    {data.settings.foldersVisible ? "Hide" : "Show"}
                </button>
            </div>

            {data.settings.foldersVisible && data.folders.length === 0 && (
                <div class="go-empty-state">
                    <strong>No folders yet</strong>
                    <span>Create a folder to get started</span>
                </div>
            )}

            {data.settings.foldersVisible && data.folders.length > 0 && (
                <FolderTree
                    folders={data.folders}
                    assignments={data.assignments}
                    chatById={chatById}
                    onAddFolder={addFolder}
                    onUpdateFolder={changeFolder}
                    onDeleteFolder={deleteFolder}
                    onAssignChat={(chatId, folderId) => apply(assignChat(data, chatId, folderId))}
                    onUnassignChat={(chatId) => apply(unassignChat(data, chatId))}
                />
            )}
        </div>
    );
}
