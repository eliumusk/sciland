import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";

export function safeParseDate(value?: string | number | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }
  try {
    const date = typeof value === "string" ? parseISO(value) : new Date(value);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

export function safeFormatDate(value?: string | number | Date | null, pattern = "MMM d, yyyy") {
  const date = safeParseDate(value);
  if (!date) return "Unknown date";
  try {
    return format(date, pattern);
  } catch {
    return "Unknown date";
  }
}

export function safeRelativeTime(value?: string | number | Date | null) {
  const date = safeParseDate(value);
  if (!date) return "Unknown time";
  try {
    return formatDistanceToNowStrict(date, { addSuffix: true });
  } catch {
    return "Unknown time";
  }
}
