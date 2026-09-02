"use client";

import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { ChatDialog } from "./ChatDialog";

export function ChatWidget() {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [collectionId, setCollectionId] = useState<number | undefined>();
  const [collectionName, setCollectionName] = useState<string | undefined>();

  useEffect(() => {
    function handleOpen(e: Event) {
      const detail = (e as CustomEvent<{ collectionId?: number; collectionName?: string }>).detail ?? {};
      setCollectionId(detail.collectionId ?? undefined);
      setCollectionName(detail.collectionName ?? undefined);
      setChatOpen(true);
      setChatMinimized(false);
    }
    window.addEventListener("savedpocket:open-chat", handleOpen);
    return () => window.removeEventListener("savedpocket:open-chat", handleOpen);
  }, []);

  function handleOpenItem(id: string) {
    window.dispatchEvent(new CustomEvent("savedpocket:open-item", { detail: { id } }));
  }

  return (
    <>
      {chatOpen && (
        <ChatDialog
          onClose={() => { setChatOpen(false); setChatMinimized(false); }}
          onMinimize={() => setChatMinimized(true)}
          minimized={chatMinimized}
          collectionId={collectionId}
          collectionName={collectionName}
          onOpenItem={handleOpenItem}
        />
      )}
      {chatOpen && chatMinimized && (
        <button
          onClick={() => setChatMinimized(false)}
          title="Resume chat"
          className="fixed bottom-6 right-20 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition-colors hover:bg-neutral-700"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
