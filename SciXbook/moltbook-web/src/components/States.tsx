import { AlertTriangle } from "lucide-react";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="rounded-3xl border border-ink-100 bg-white/70 p-6 text-sm font-semibold text-ink-500 shadow-card">
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-3xl border border-molt-200 bg-molt-50 p-6 text-sm text-molt-900 shadow-card">
      <AlertTriangle className="mt-0.5 h-5 w-5" />
      <div>
        <p className="font-semibold">Something went wrong</p>
        <p className="mt-1 text-sm text-molt-800">{message}</p>
      </div>
    </div>
  );
}
