import { create } from "zustand";
import type { Message } from "@/types";
import { saveChatMessage, getChatMessages } from "@/lib/db";

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  
  initialize: () => Promise<void>;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  // Cloud sync method for the assistant's final response
  syncMessage: (id: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,

  initialize: async () => {
    try {
      const history = await getChatMessages();
      if (history.length > 0) {
        set({ messages: history });
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  },
  
  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
    // Fire and forget for user messages
    if (message.role === "user") {
      saveChatMessage(message).catch(console.error);
    }
  },
    
  clearMessages: () => set({ messages: [], error: null }),
    
  setLoading: (loading) => set({ isLoading: loading }),
    
  setError: (error) => set({ error }),
    
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    })),

  syncMessage: async (id) => {
    const msg = get().messages.find(m => m.id === id);
    if (msg) {
      await saveChatMessage(msg);
    }
  }
}));
