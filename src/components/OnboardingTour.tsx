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
              "Your personal AI-powered reading list. Here's a quick tour of what you can do.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: '[data-tour="paste-input"]',
          popover: {
            title: "Save anything",
            description:
              "Paste any URL here to save it. AI automatically categorizes, tags, and summarizes it for you.",
            side: "bottom",
            align: "end",
          },
        },
        {
          element: '[data-tour="search-bar"]',
          popover: {
            title: "Search your library",
            description:
              "Find anything you've saved — by title, topic, or meaning. Semantic search included.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: '[data-tour="sidebar"]',
          popover: {
            title: "Filter and organize",
            description:
              "Browse by category, platform, or your own collections to stay organized.",
            side: "right",
            align: "start",
          },
        },
        {
          element: '[data-tour="chat-button"]',
          popover: {
            title: "Chat with your library",
            description:
              'Ask questions like "What did I save about React?" and get AI-powered answers from your saved content.',
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
      className="fixed right-4 top-1/2 z-40 -translate-y-1/2 flex items-center justify-center rounded-full border border-neutral-200 bg-white p-2.5 text-neutral-400 shadow-sm transition-colors hover:bg-neutral-50 hover:text-neutral-700"
    >
      <HelpCircle className="h-4 w-4" />
    </button>
  );
}
