import type { GeminiChat } from "../domain/types";
import { setSingleChatDragImage } from "../drag-preview";

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
            ref={(link) => {
                if (!link) return;
                link.ondragstart = (event) => {
                    event.stopImmediatePropagation();
                    event.dataTransfer?.setData("text/plain", chatId);
                    if (event.dataTransfer) {
                        event.dataTransfer.effectAllowed = "move";
                        setSingleChatDragImage(event, chat?.label ?? chatId, link);
                    }
                    window.getSelection()?.removeAllRanges();
                };
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
