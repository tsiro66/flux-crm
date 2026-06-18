import { clients, projects, payments, files, chatConversations, chatMessages } from './schema';

export type Client = typeof clients.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type FileRecord = typeof files.$inferSelect;
export type ChatConversation = typeof chatConversations.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
