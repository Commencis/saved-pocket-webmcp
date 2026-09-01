import { Suspense } from "react";
import type { Metadata } from "next";
import { WebMCPGateway } from "@/components/WebMCPGateway";

export const metadata: Metadata = {
  title: "WebMCP Gateway — SavedPocket",
  description: "Browser AI tools for your SavedPocket library. Expose search, save, and collection tools to any WebMCP-aware AI agent.",
};

export default function WebMCPPage() {
  return (
    <Suspense>
      <WebMCPGateway />
    </Suspense>
  );
}
