"use client";

import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { HelpCircle } from "lucide-react";
import { useCallback, useEffect } from "react";

const TOUR_KEY = "savedpocket:tour-done";

export function OnboardingTour({ onOpenChat }: { onOpenChat: () => void }) {
  const startTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      steps: [
        {
          element: '[data-tour="header"]',
          popover: {
            title: "Welcome to SavedPocket",
            description:
              "Your personal AI-powered reading list. Here's a quick tour of everything you can do.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: '[data-tour="paste-input"]',
          popover: {
            title: "Save any link",
            description:
              "Paste any URL here to save it instantly. AI will categorize, tag, and summarize it automatically.",
            side: "bottom",
            align: "end",
          },
        },
        {
          element: '[data-tour="search-bar"]',
          popover: {
            title: "Search your library",
            description:
              "Find anything you've saved — by title, topic, or meaning. Semantic search understands context, not just keywords.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: '[data-tour="sidebar"]',
          popover: {
            title: "Filter and organize",
            description:
              "Browse by category, source platform, or your own collections. Everything sorted automatically.",
            side: "right",
            align: "start",
          },
        },
        {
          element: '[data-tour="whatsapp-import"]',
          popover: {
            title: "Import from WhatsApp",
            description:
              "Export a WhatsApp chat and upload the .txt file — all links inside are detected and saved automatically.",
            side: "bottom",
            align: "end",
          },
        },
        {
          element: '[data-tour="marketplace"]',
          popover: {
            title: "Collection Marketplace",
            description:
              "Discover and subscribe to curated collections shared by the community.",
            side: "bottom",
            align: "end",
          },
        },
        {
          element: '[data-tour="docs"]',
          popover: {
            title: "Documentation",
            description:
              "Learn how to get the most out of SavedPocket — keyboard shortcuts, API, Chrome extension, and more.",
            side: "bottom",
            align: "end",
          },
        },
        {
          element: '[data-tour="settings-button"]',
          popover: {
            title: "Settings",
            description:
              "Add your OpenAI API key to unlock AI analysis. Your key is stored only in your local database.",
            side: "bottom",
            align: "end",
          },
        },
        {
          element: '[data-tour="chat-button"]',
          popover: {
            title: "Chat with your library",
            description:
              'The heart of SavedPocket. Ask anything — "What did I save about React?" or "Summarize my reading list." AI searches your entire library to answer.',
            nextBtnText: "Open Chat →",
            side: "bottom",
            align: "end",
          },
        },
      ],
      onNextClick: () => {
        if (driverObj.isLastStep()) {
          onOpenChat();
          driverObj.destroy();
          try {
            localStorage.setItem(TOUR_KEY, "1");
          } catch {}
        } else {
          driverObj.moveNext();
        }
      },
      onDestroyed: () => {
        try {
          localStorage.setItem(TOUR_KEY, "1");
        } catch {}
      },
    });
    driverObj.drive();
  }, [onOpenChat]);

  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_KEY)) {
        const t = setTimeout(startTour, 600);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [startTour]);

  return (
    <button
      onClick={startTour}
      title="Take the tour"
      className="fixed bottom-6 right-3 z-40 flex items-center justify-center rounded-full bg-violet-600 p-3 text-white shadow-lg shadow-violet-300 transition-all hover:scale-110 hover:bg-violet-700 hover:shadow-violet-400"
    >
      <HelpCircle className="h-5 w-5" />
    </button>
  );
}
