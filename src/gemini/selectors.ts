export const selectors = {
    chatsSection: 'expandable-section[data-test-id="chats-expandable-section"]',
    chatsContainer: ".expandable-section-content-inner",
    chatLink: 'mat-nav-list > gem-nav-list-item[data-test-id="conversation"] > a[href*="/app/"]',
    header: ".expandable-section-header-row",
} as const;
