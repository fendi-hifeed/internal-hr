import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, locale = "id-ID") {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatTime(date: string | Date) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(new Date(date));
}

export function formatTimeWIB(date: string | Date) {
  return formatTime(date) + " WIB";
}

export function getFlagStatus(submitHour: number): {
  status: "ON_TIME" | "LATE" | "VERY_LATE" | "ABSENT_FLAG";
  label: string;
  color: string;
  bgColor: string;
} {
  if (submitHour < 8.25) return { status: "ON_TIME", label: "On Time", color: "text-emerald-600", bgColor: "bg-emerald-100" };
  if (submitHour < 9) return { status: "LATE", label: "Late", color: "text-amber-600", bgColor: "bg-amber-100" };
  if (submitHour < 12) return { status: "VERY_LATE", label: "Very Late", color: "text-red-600", bgColor: "bg-red-100" };
  return { status: "ABSENT_FLAG", label: "Absent", color: "text-gray-600", bgColor: "bg-gray-100" };
}

export function generateIdempotencyKey() {
  return crypto.randomUUID();
}

/** Format coordinates as "-6.859882, 107.623053" */
export function formatGeoCoords(lat?: number, lng?: number): string {
  if (lat == null || lng == null) return "—";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/** Build Google Maps search link from coordinates */
export function getGoogleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Compress a video frame (HTMLVideoElement) to a smaller JPEG.
 * - Scales down to MAX_WIDTH (default 800px) preserving aspect ratio
 * - Compresses to JPEG quality (default 0.6) for storage efficiency
 * Returns { dataUrl } for preview and { blob, file } for upload.
 */
export async function compressSelfieImage(
  video: HTMLVideoElement,
  options: { maxWidth?: number; quality?: number } = {}
): Promise<{ dataUrl: string; blob: Blob; file: File }> {
  const MAX_WIDTH = options.maxWidth ?? 800;
  const QUALITY = options.quality ?? 0.6;

  const srcW = video.videoWidth;
  const srcH = video.videoHeight;

  // Scale to max width, preserve aspect ratio
  const scale = srcW > MAX_WIDTH ? MAX_WIDTH / srcW : 1;
  const dstW = Math.round(srcW * scale);
  const dstH = Math.round(srcH * scale);

  // Draw scaled frame to offscreen canvas
  const offscreen = document.createElement("canvas");
  offscreen.width = dstW;
  offscreen.height = dstH;
  const ctx = offscreen.getContext("2d")!;
  ctx.drawImage(video, 0, 0, dstW, dstH);

  // Compress to JPEG blob at target quality
  const blob = await new Promise<Blob | null>((resolve) =>
    offscreen.toBlob(resolve, "image/jpeg", QUALITY)
  );
  if (!blob) throw new Error("Gagal mengkompres gambar");

  const timestamp = Date.now();
  const file = new File([blob], `selfie-${timestamp}.jpg`, { type: "image/jpeg" });
  const dataUrl = offscreen.toDataURL("image/jpeg", QUALITY);

  return { dataUrl, blob, file };
}
