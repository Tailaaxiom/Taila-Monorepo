// src/lib/types/message.ts
import { Database } from './database.types';

export type MessageRow = Database['public']['Tables']['messages']['Row'];

export interface MessageRef {
  type: string;
  id: string;
  label?: string;
  path?: string;
}

export type Message = MessageRow; // refs stays as Json — genuinely native, no decode step needed

export function parseMessage(row: MessageRow): Message {
  return row;
}