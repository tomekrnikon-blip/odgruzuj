import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Masks an email address for privacy - shows first 4 chars + domain
 * Example: "john.doe@gmail.com" → "john****@gmail.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  
  const [localPart, domain] = email.split('@');
  const visibleChars = Math.min(4, localPart.length);
  const maskedLocal = localPart.slice(0, visibleChars) + '****';
  
  return `${maskedLocal}@${domain}`;
}
