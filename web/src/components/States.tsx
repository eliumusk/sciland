import { AlertTriangle } from "lucide-react";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="neo-card-sm p-6 text-base font-medium text-gray-600">
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 border-[3px] border-black bg-white p-6 shadow-neo">
      <AlertTriangle className="mt-0.5 h-6 w-6 text-accent" />
      <div>
        <p className="font-bold text-black">Something went wrong</p>
        <p className="mt-1 text-base text-gray-600">{message}</p>
      </div>
    </div>
  );
}
