"use client";

import ChatWindow from "@/components/chat/ChatWindow";
import { PasswordGate } from "@/components/auth/PasswordGate";

export default function Home() {
  return (
    <PasswordGate>
      <ChatWindow />
    </PasswordGate>
  );
}
