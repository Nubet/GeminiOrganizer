const FOLDER_COLORS = [
    '#EA4335', '#FB8C00', '#F9AB00', '#34A853', '#00ACC1',
    '#4285F4', '#9334E6', '#E91E63', '#5F6368'
];

let appState = {
    folders: [],
    foldersVisible: true
};

let domSyncScheduled = false;

function createFolderObject(name = 'New Folder') {
    return {
        id: 'folder_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name,
        color: getNextFolderColor(),
        icon: 'folder',
        isExpanded: true,
        chats: [],
        subfolders: []
    };
}

function normalizeFolder(folder) {
    return {
        id: folder?.id || 'folder_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name: folder?.name || 'New Folder',
        color: folder?.color || '#4285F4',
        icon: folder?.icon || 'folder',
        isExpanded: folder?.isExpanded !== false,
        chats: Array.isArray(folder?.chats) ? folder.chats : [],
        subfolders: Array.isArray(folder?.subfolders)
            ? folder.subfolders.map(normalizeFolder)
            : []
    };
}

function normalizeStateFolders() {
    appState.folders = Array.isArray(appState.folders)
        ? appState.folders.map(normalizeFolder)
        : [];
}

function removeChatFromFolders(chatHref, folders = appState.folders) {
    folders.forEach(folder => {
        folder.chats = folder.chats.filter(href => href !== chatHref);
        removeChatFromFolders(chatHref, folder.subfolders);
    });
}

function findFolderContainingChat(chatHref, folders = appState.folders) {
    for (const folder of folders) {
        if (folder.chats.includes(chatHref)) {
            return folder;
        }

        const subfolderMatch = findFolderContainingChat(chatHref, folder.subfolders);
        if (subfolderMatch) {
            return subfolderMatch;
        }
    }

    return null;
}

function removeFolderById(folderId, folders = appState.folders) {
    for (let i = folders.length - 1; i >= 0; i -= 1) {
        const folder = folders[i];

        if (folder.id === folderId) {
            folders.splice(i, 1);
            return true;
        }

        if (removeFolderById(folderId, folder.subfolders)) {
            return true;
        }
    }

    return false;
}

// something is very fucked with the folder sync but idk what. works for now
async function init() {
    try {
        if (chrome?.storage?.sync) {
            const syncData = await chrome.storage.sync.get(['geminiFolders', 'geminiFoldersVisible']);
            appState.foldersVisible = syncData.geminiFoldersVisible !== false;
            if (syncData.geminiFolders) {
                appState.folders = syncData.geminiFolders;
            } else if (chrome?.storage?.local) {
                const localData = await chrome.storage.local.get(['geminiFolders', 'geminiFoldersVisible']);
                if (localData.geminiFolders) {
                    appState.folders = localData.geminiFolders;
                    chrome.storage.sync.set({
                        geminiFolders: appState.folders,
                        geminiFoldersVisible: localData.geminiFoldersVisible !== false
                    }).catch(() => {});
                }
                appState.foldersVisible = localData.geminiFoldersVisible !== false;
            } else {
                appState.foldersVisible = syncData.geminiFoldersVisible !== false;
            }
        } else if (chrome?.storage?.local) {
            const localData = await chrome.storage.local.get(['geminiFolders', 'geminiFoldersVisible']);
            if (localData && localData.geminiFolders) {
                appState.folders = localData.geminiFolders;
            }
            appState.foldersVisible = localData.geminiFoldersVisible !== false;
        }
    } catch (error) {
        console.warn("Storage error. Starting fresh.");
    }
    normalizeStateFolders();
    observeDOM();
}

function saveState() {
    if (chrome?.storage?.local) {
        chrome.storage.local.set({
            geminiFolders: appState.folders,
            geminiFoldersVisible: appState.foldersVisible
        }).catch(() => {});
    }
    if (chrome?.storage?.sync) {
        chrome.storage.sync.set({
            geminiFolders: appState.folders,
            geminiFoldersVisible: appState.foldersVisible
        }).catch(() => {});
    }
}

function observeDOM() {
    const syncSidebarUI = () => {
        const listContainer = findChatsListContainer();

        if (!listContainer) {
            return;
        }

        if (!document.getElementById('gemini-organizer-root')) {
            injectUI(listContainer);
        } else {
            ensureChatsHeaderButton();
            organizeChats();
        }
    };

    const observer = new MutationObserver(() => {
        if (domSyncScheduled) {
            return;
        }

        domSyncScheduled = true;
        requestAnimationFrame(() => {
            domSyncScheduled = false;
            syncSidebarUI();
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    syncSidebarUI();
}

function getAllFolderColors(folders = appState.folders) {
    return folders.flatMap(folder => [folder.color, ...getAllFolderColors(folder.subfolders)]);
}

function getNextFolderColor() {
    const usedColors = new Set(getAllFolderColors());
    const availableColors = FOLDER_COLORS.filter(color => !usedColors.has(color));
    const colors = availableColors.length > 0 ? availableColors : FOLDER_COLORS;
    return colors[Math.floor(Math.random() * colors.length)];
}

function findChatsListContainer() {
    const chatsSection = document.querySelector(
        'expandable-section[data-test-id="chats-expandable-section"]'
    );

    return chatsSection?.querySelector('.expandable-section-content-inner') || null;
}

function injectUI(listContainer) {
    const root = document.createElement('div');
    root.id = 'gemini-organizer-root';
    root.className = 'gemini-organizer-container';

    listContainer.prepend(root);

    setupMainListDropTarget(listContainer);
    ensureChatsHeaderButton();
    renderFolders();
}

function setupMainListDropTarget(listContainer) {
    if (!listContainer || listContainer.dataset.goMainDropReady === '1') {
        return;
    }

    listContainer.dataset.goMainDropReady = '1';

    listContainer.addEventListener('dragover', (e) => {
        if (e.target.closest('.go-folder')) {
            return;
        }

        e.preventDefault();
        const root = document.getElementById('gemini-organizer-root');
        if (root) {
            root.classList.add('go-main-drop-active');
        }
    });

    listContainer.addEventListener('dragleave', (e) => {
        const relatedTarget = e.relatedTarget;
        if (relatedTarget && listContainer.contains(relatedTarget)) {
            return;
        }

        const root = document.getElementById('gemini-organizer-root');
        if (root) {
            root.classList.remove('go-main-drop-active');
        }
    });

    listContainer.addEventListener('drop', (e) => {
        const root = document.getElementById('gemini-organizer-root');
        if (root) {
            root.classList.remove('go-main-drop-active');
        }

        if (e.target.closest('.go-folder')) {
            return;
        }

        const chatHref = e.dataTransfer.getData('text/plain');
        if (!chatHref) {
            return;
        }

        e.preventDefault();
        removeChatFromFolders(chatHref);
        saveState();
        renderFolders();
    });
}

function ensureChatsHeaderButton() {
    const chatsSection = document.querySelector(
        'expandable-section[data-test-id="chats-expandable-section"]'
    );
    const headerContainer = chatsSection?.querySelector('.expandable-section-header-row');

    if (!headerContainer) {
        return;
    }

    headerContainer.classList.add('go-chats-header-anchor');

    const existingButton = document.getElementById('gemini-organizer-add-btn');
    if (existingButton && existingButton.parentElement === headerContainer) {
        return;
    }

    if (existingButton) {
        existingButton.remove();
    }

    const addBtn = document.createElement('button');
    addBtn.id = 'gemini-organizer-add-btn';
    addBtn.className = 'go-add-folder-icon';
    addBtn.type = 'button';
    addBtn.innerText = '+';
    addBtn.title = 'Create folder';
    addBtn.setAttribute('aria-label', 'Create folder');
    addBtn.onclick = createFolder;

    headerContainer.appendChild(addBtn);
}

function createFolder() {
    const newFolder = createFolderObject();
    appState.folders.push(newFolder);
    saveState();
    renderFolders();
}

function createSubFolder(parentFolder) {
    parentFolder.subfolders.push(createFolderObject('New Sub-folder'));
    parentFolder.isExpanded = true;
    saveState();
    renderFolders();
}

function renderFolders() {
    const root = document.getElementById('gemini-organizer-root');
    if (!root) return;

    const sidebarContainer = root.parentNode;
    root.querySelectorAll('.go-folder a[href^="/app/"]').forEach(chat => {
        if (!chat.dataset.goFolderReference) {
            sidebarContainer.appendChild(chat);
        }
    });
    root.replaceChildren();

    const toolbar = document.createElement('div');
    toolbar.className = 'go-toolbar';

    const title = document.createElement('span');
    title.className = 'go-toolbar-title';
    title.textContent = 'Folders';

    const visibilityButton = document.createElement('button');
    visibilityButton.type = 'button';
    visibilityButton.className = 'go-toolbar-toggle';
    visibilityButton.textContent = appState.foldersVisible ? 'Hide' : 'Show';
    visibilityButton.setAttribute(
        'aria-label',
        appState.foldersVisible ? 'Hide folders' : 'Show folders'
    );
    visibilityButton.onclick = () => {
        appState.foldersVisible = !appState.foldersVisible;
        saveState();
        renderFolders();
    };

    toolbar.appendChild(title);
    toolbar.appendChild(visibilityButton);
    root.appendChild(toolbar);

    if (!appState.foldersVisible) {
        return;
    }

    if (appState.folders.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'go-empty-state';
        emptyState.innerHTML = '<strong>No folders yet</strong><span>Create a folder to get started</span>';
        root.appendChild(emptyState);
        return;
    }

    renderFolderTree(appState.folders, root);

    organizeChats();
}

function renderFolderTree(folders, parentElement) {
    folders.forEach(folderData => {
        const folderEl = document.createElement('div');
        folderEl.className = `go-folder ${folderData.isExpanded ? 'expanded' : ''}`;
        folderEl.dataset.id = folderData.id;

        const header = document.createElement('div');
        header.className = 'go-folder-header';

        const chevron = document.createElement('div');
        chevron.className = 'go-folder-chevron';
        chevron.innerText = '▶';

        header.onclick = () => {
            folderData.isExpanded = !folderData.isExpanded;
            saveState();
            folderEl.classList.toggle('expanded');
        };

        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.className = 'go-folder-color';
        colorPicker.value = folderData.color;

        const colorDot = document.createElement('button');
        colorDot.type = 'button';
        colorDot.className = 'go-folder-dot';
        colorDot.title = 'Change folder color';
        colorDot.style.backgroundColor = folderData.color;

        const colorWrap = document.createElement('div');
        colorWrap.className = 'go-folder-color-wrap';
        colorWrap.onclick = (e) => e.stopPropagation();

        colorPicker.onclick = (e) => e.stopPropagation();
        colorPicker.oninput = (e) => {
            folderData.color = e.target.value;
            colorDot.style.backgroundColor = folderData.color;
            saveState();
        };

        colorPicker.onchange = (e) => {
            folderData.color = e.target.value;
            colorDot.style.backgroundColor = folderData.color;
            saveState();
        };

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'go-folder-name';
        nameInput.value = folderData.name;
        nameInput.onclick = (e) => e.stopPropagation();
        nameInput.onchange = (e) => {
            folderData.name = e.target.value;
            saveState();
        };

        const delBtn = document.createElement('button');
        delBtn.innerText = '×';
        delBtn.className = 'go-folder-delete';
        delBtn.title = 'Delete folder';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Delete this folder? (Chats will return to the main list)')) {
                removeFolderById(folderData.id);
                saveState();
                renderFolders();
            }
        };

        const addSubBtn = document.createElement('button');
        addSubBtn.innerText = '+';
        addSubBtn.className = 'go-folder-add-sub';
        addSubBtn.title = 'Create sub-folder';
        addSubBtn.onclick = (e) => {
            e.stopPropagation();
            createSubFolder(folderData);
        };

        header.appendChild(chevron);
        colorWrap.appendChild(colorDot);
        colorWrap.appendChild(colorPicker);
        header.appendChild(colorWrap);
        header.appendChild(nameInput);
        header.appendChild(addSubBtn);
        header.appendChild(delBtn);

        const content = document.createElement('div');
        content.className = 'go-folder-content';

        folderData.chats.forEach(chatHref => {
            const chatLink = document.querySelector(
                `a[href="${CSS.escape(chatHref)}"]`
            );
            if (!chatLink) return;

            const reference = chatLink.cloneNode(true);
            reference.dataset.goFolderReference = '1';
            reference.classList.add('go-folder-chat');
            reference.querySelector('.go-folder-marker')?.remove();
            reference.draggable = true;
            reference.ondragstart = (e) => {
                startChatDrag(e, chatHref, reference);
            };
            content.appendChild(reference);
        });

        const subfolders = document.createElement('div');
        subfolders.className = 'go-subfolders';

        setupDragAndDrop(folderEl, folderData, content);

        content.appendChild(subfolders);
        folderEl.appendChild(header);
        folderEl.appendChild(content);
        parentElement.appendChild(folderEl);

        if (folderData.subfolders.length > 0) {
            renderFolderTree(folderData.subfolders, subfolders);
        }
    });
}

function startChatDrag(event, chatHref, source) {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', chatHref);

    const preview = document.createElement('div');
    preview.textContent = source.getAttribute('aria-label') || source.textContent.trim();
    preview.style.cssText = [
        'position: fixed',
        'top: -1000px',
        'left: -1000px',
        'width: 260px',
        'padding: 8px 12px',
        'overflow: hidden',
        'border: 1px solid rgba(128, 128, 128, 0.35)',
        'border-radius: 8px',
        'background: #ffffff',
        'color: #202124',
        'font: 14px "Google Sans", "Segoe UI", sans-serif',
        'white-space: nowrap',
        'text-overflow: ellipsis',
        'pointer-events: none'
    ].join(';');

    document.body.appendChild(preview);
    event.dataTransfer.setDragImage(preview, 12, 12);
    requestAnimationFrame(() => preview.remove());
}

function setupDragAndDrop(folderEl, folderData, content) {
    folderEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        folderEl.classList.add('drag-over');
    });

    folderEl.addEventListener('dragleave', (e) => {
        e.stopPropagation();
        folderEl.classList.remove('drag-over');
    });

    folderEl.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        folderEl.classList.remove('drag-over');

        folderData.isExpanded = true;

        const chatHref = e.dataTransfer.getData('text/plain');

        if (chatHref) {
            removeChatFromFolders(chatHref);

            if (!folderData.chats.includes(chatHref)) {
                folderData.chats.push(chatHref);
            }

            saveState();
            renderFolders();
        }
    });
}

function organizeChats() {
    const root = document.getElementById('gemini-organizer-root');
    if (!root) return;

    const chatLinks = findChatsListContainer()?.querySelectorAll(
        'mat-nav-list > gem-nav-list-item[data-test-id="conversation"] > a[href^="/app/"]'
    ) || [];

    chatLinks.forEach(link => {
        const href = link.getAttribute('href');

        link.draggable = true;
        link.ondragstart = (e) => {
            startChatDrag(e, href, link);
        };

        const targetFolder = findFolderContainingChat(href);

        const marker = link.querySelector('.go-folder-marker');
        if (!targetFolder) {
            link.classList.remove('go-chat-in-folder');
            marker?.remove();
            return;
        }

        link.classList.add('go-chat-in-folder');
        const folderMarker = marker || document.createElement('span');
        folderMarker.className = 'go-folder-marker';
        folderMarker.textContent = '';
        folderMarker.title = `In folder: ${targetFolder.name}`;
        folderMarker.setAttribute('aria-label', `In folder: ${targetFolder.name}`);
        folderMarker.style.backgroundColor = targetFolder.color;
        if (!marker) {
            link.appendChild(folderMarker);
        }
    });
}

init();