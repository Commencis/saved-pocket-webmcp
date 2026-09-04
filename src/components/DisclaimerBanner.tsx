export function DisclaimerBanner() {
  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2.5">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2.5">
        <span className="shrink-0 text-base leading-none" aria-hidden>🏆</span>
        <p className="text-xs leading-snug text-amber-900 text-center">
          <span className="font-semibold">Demo project — </span>
          SavedPocket was built for the{" "}
          <span className="font-medium">OpenAI WebMCP Challenge</span>.
          {" "}It is provided for evaluation and testing purposes only and is not intended for
          production use or real personal data.
        </p>
      </div>
    </div>
  );
}
