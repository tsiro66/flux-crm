export type Conversation = {
	id: string;
	title: string;
	createdAt: string;
	updatedAt: string;
};

let conversations = $state<Conversation[]>([]);
let activeConversationId = $state<string | null>(null);

export function getConversations(): Conversation[] {
	return conversations;
}

export function getActiveConversationId(): string | null {
	return activeConversationId;
}

export function setConversations(value: Conversation[]) {
	conversations = value;
}

export function setActiveConversationId(id: string | null) {
	activeConversationId = id;
}

export function updateConversationTitle(id: string, title: string) {
	conversations = conversations.map((c) => (c.id === id ? { ...c, title } : c));
}

export function removeConversation(id: string) {
	conversations = conversations.filter((c) => c.id !== id);
	if (activeConversationId === id) {
		activeConversationId = null;
	}
}

export function prependConversation(conv: Conversation) {
	conversations = [conv, ...conversations];
	activeConversationId = conv.id;
}
