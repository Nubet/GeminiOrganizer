import type { GeminiChat } from "../domain/types";

interface FolderChatProps {
    chatId: string;
    chat: GeminiChat | undefined;
    onUnassign: (chatId: string) => Promise<void>;
}

export function FolderChat({ chatId, chat, onUnassign }: FolderChatProps) {
    return (
        <a
            class="go-folder-chat"
            href={chat?.href ?? chatId}
            draggable={true}
            onDragStart={(event) => {
                event.dataTransfer?.setData("text/plain", chatId);
                if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
            }}
            onContextMenu={(event) => {
                event.preventDefault();
                void onUnassign(chatId);
            }}
        >
            {chat?.label ?? chatId}
        </a>
    );
}
