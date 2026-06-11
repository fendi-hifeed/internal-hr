"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { getFlagStatus, generateIdempotencyKey, compressSelfieImage } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Camera, Clock, CheckCircle, AlertTriangle, Loader2,
  Navigation, RefreshCw, User, X, Video, AlertCircle
} from "lucide-react";

interface LocationData {
  latitude: number;
  longitude: number;
  locationName: string;
}

interface TodayStatus {
  hasClockedIn: boolean;
  hasClockedOut: boolean;
  clockInTime?: string;
  clockOutTime?: string;
  clockInFlag?: string;
}

// Reverse geocode coordinates to address using Nominatim
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { "Accept-Language": "id" } }
    );
    if (!res.ok) throw new Error("geocoding failed");
    const data = await res.json();
    const addr = data.address || {};
    const parts = [
      addr.road || addr.purpose || addr.amenity,
      addr.neighbourhood || addr.suburb,
      addr.city || addr.town || addr.village || addr.municipality,
      addr.province,
    ].filter(Boolean);
    return parts.length > 0 ? parts.slice(0, 3).join(", ") : "Lokasi tidak diketahui";
  } catch {
    return "Lokasi tidak diketahui";
  }
}

  // Get real GPS location from browser
function getBrowserLocation(): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation tidak didukung browser ini"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const locationName = await reverseGeocode(lat, lng);
        resolve({ latitude: lat, longitude: lng, locationName });
      },
      (err) => {
        if (err.code === 1) {
          // PERMISSION_DENIED — user dismissed prompt too many times
          reject(new Error("PERMISSION_DENIED"));
        } else {
          reject(new Error(`Gagal mendapatkan lokasi: ${err.message}`));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  });
}

export default function AttendancePage() {
  const { user } = useAuth();

  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());
  const [todayStatus, setTodayStatus] = useState<TodayStatus>({
    hasClockedIn: false,
    hasClockedOut: false,
  });
  const [lastAction, setLastAction] = useState<{
    type: "clock_in" | "clock_out";
    success: boolean;
    message: string;
    flag?: string;
    time?: string;
  } | null>(null);

  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Get real GPS location
  const getRealLocation = useCallback(async () => {
    setIsGettingLocation(true);
    setLocationError(null);
    try {
      const loc = await getBrowserLocation();
      setLocation(loc);
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : "Gagal mendapatkan lokasi");
    } finally {
      setIsGettingLocation(false);
    }
  }, []);

  // Auto-fetch location on mount
  useEffect(() => {
    getRealLocation();
  }, [getRealLocation]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setShowCamera(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraError("Izin kamera ditolak. Mohon aktifkan akses kamera di pengaturan browser.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCameraError("Kamera tidak ditemukan di perangkat ini.");
        } else {
          setCameraError(`Tidak dapat mengakses kamera: ${err.message}`);
        }
      } else {
        setCameraError("Tidak dapat mengakses kamera.");
      }
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }, []);

  // Capture photo from video stream — auto-compresses to max 800px / JPEG 60%
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      const { dataUrl, file } = await compressSelfieImage(videoRef.current);
      setSelfieFile(file);
      setSelfiePreview(dataUrl);
      stopCamera();
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "Gagal mengambil foto. Silakan coba lagi."
      );
    }
  }, [stopCamera]);

  // Clear selfie
  const clearSelfie = useCallback(() => {
    setSelfiePreview(null);
    setSelfieFile(null);
    stopCamera();
  }, [stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Handle clock in
  const handleClockIn = async () => {
    if (!selfieFile || !location) return;

    setIsSubmitting(true);
    try {
      const photoData = selfiePreview || "";
      const result = await api.clockIn({
        photo: photoData,
        latitude: location.latitude,
        longitude: location.longitude,
        location_name: location.locationName,
        idempotencyKey,
      });

      const now = new Date();
      const hour = now.getHours() + now.getMinutes() / 60;
      const flagInfo = getFlagStatus(hour);

      setTodayStatus((prev) => ({
        ...prev,
        hasClockedIn: true,
        clockInTime: result.clockInTime,
        clockInFlag: flagInfo.label,
      }));

      setLastAction({
        type: "clock_in",
        success: true,
        message: `Clock In berhasil pada ${result.clockInTime}`,
        flag: flagInfo.label,
        time: result.clockInTime,
      });

      clearSelfie();
    } catch (err) {
      setLastAction({
        type: "clock_in",
        success: false,
        message: err instanceof Error ? err.message : "Clock In gagal",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle clock out
  const handleClockOut = async () => {
    if (!selfieFile || !location) return;

    setIsSubmitting(true);
    try {
      const photoData = selfiePreview || "";
      const result = await api.clockOut({
        photo: photoData,
        latitude: location.latitude,
        longitude: location.longitude,
        location_name: location.locationName,
        idempotencyKey,
      });

      setTodayStatus((prev) => ({
        ...prev,
        hasClockedOut: true,
        clockOutTime: result.clockOutTime,
      }));

      setLastAction({
        type: "clock_out",
        success: true,
        message: `Clock Out berhasil pada ${result.clockOutTime}`,
        time: result.clockOutTime,
      });

      clearSelfie();
    } catch (err) {
      setLastAction({
        type: "clock_out",
        success: false,
        message: err instanceof Error ? err.message : "Clock Out gagal",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current hour for flag preview
  const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
  const flagPreview = getFlagStatus(currentHour);

  // Check if can clock in/out
  const canClockIn = !todayStatus.hasClockedIn && selfieFile && location;
  const canClockOut = todayStatus.hasClockedIn && !todayStatus.hasClockedOut && selfieFile && location;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Camera modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4">
            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
            {/* Live video feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-[4/3] rounded-xl object-cover bg-black"
            />
            {/* Controls overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent rounded-b-xl flex items-center justify-between">
              <Button variant="ghost" onClick={clearSelfie} className="text-white hover:bg-white/20">
                <X className="h-5 w-5 mr-1" /> Batal
              </Button>
              <button
                onClick={capturePhoto}
                className="h-16 w-16 rounded-full bg-white border-4 border-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
              >
                <div className="h-12 w-12 rounded-full bg-red-500" />
              </button>
              <Button variant="ghost" onClick={stopCamera} className="text-white hover:bg-white/20">
                <Camera className="h-5 w-5 mr-1" /> Tutup
              </Button>
            </div>
            <p className="text-center text-white text-sm mt-3">Arahkan wajah ke kamera</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Presensi</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{new Date().toLocaleTimeString("id-ID")} WIB</span>
        </div>
      </div>

      {/* User Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{user?.name || "Employee"}</p>
              <p className="text-sm text-muted-foreground">{user?.department}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">Idempotency Key</p>
              <p className="text-xs font-mono text-muted-foreground">
                {idempotencyKey.slice(0, 8)}...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Status */}
      {todayStatus.hasClockedIn && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-700">Sudah Clock In</p>
                <p className="text-sm text-emerald-600">
                  {todayStatus.clockInTime} •{" "}
                  <Badge
                    variant={todayStatus.clockInFlag === "On Time" ? "success" : "warning"}
                    className="ml-1"
                  >
                    {todayStatus.clockInFlag}
                  </Badge>
                </p>
              </div>
              {todayStatus.clockOutTime && (
                <div className="ml-auto text-right">
                  <p className="text-sm font-medium">Clock Out</p>
                  <p className="text-sm text-muted-foreground">{todayStatus.clockOutTime}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* GPS Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Navigation className="h-5 w-5" />
            Lokasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={getRealLocation}
            disabled={isGettingLocation}
            className="w-full"
          >
            {isGettingLocation ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Mendeteksi Lokasi...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                {location ? "Update Lokasi" : "Dapatkan Lokasi"}
              </>
            )}
          </Button>

          {locationError === "PERMISSION_DENIED" ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700">Izin Lokasi Diblokir</p>
                <p className="text-xs text-amber-600 mt-1">
                  Browser memblokir akses lokasi karena terlalu banyak penolakan. Untuk mengaktifkan:
                </p>
                <ol className="text-xs text-amber-600 mt-1 list-decimal list-inside space-y-0.5">
                  <li>Klik ikon 🔒 / 📍 di sebelah kiri URL address bar</li>
                  <li>Atau klik ikon ⚙️ (tune) di address bar</li>
                  <li>Pilih "Site settings" → Lokasi → pilih "Allow"</li>
                  <li>Kembali ke halaman ini dan klik "Dapatkan Lokasi" lagi</li>
                </ol>
                <button
                  onClick={getRealLocation}
                  className="text-xs text-amber-700 underline mt-2 font-semibold"
                >
                  ↻ Coba lagi setelah mengubah pengaturan
                </button>
              </div>
            </div>
          ) : locationError ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-red-700">{locationError}</p>
                <button
                  onClick={getRealLocation}
                  className="text-xs text-red-600 underline mt-1 font-medium"
                >
                  Coba lagi
                </button>
              </div>
            </div>
          ) : null}

          {location && !locationError && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium">{location.locationName}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selfie Capture via Browser Camera */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5" />
            Foto Selfie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cameraError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-red-700">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="text-xs text-red-600 underline mt-1 font-medium"
                >
                  Coba lagi
                </button>
              </div>
            </div>
          )}

          {selfiePreview ? (
            <div className="space-y-4">
              <div className="relative aspect-square max-w-xs mx-auto rounded-xl overflow-hidden border-2 border-primary">
                <img
                  src={selfiePreview}
                  alt="Selfie preview"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={clearSelfie}
                  className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Foto selfie siap diupload
              </p>
            </div>
          ) : (
            <button
              onClick={startCamera}
              className="w-full aspect-video max-w-xs mx-auto flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 transition-all"
            >
              <Video className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Tap untuk buka kamera</p>
              <p className="text-xs text-muted-foreground/70">Ambil foto via kamera browser</p>
            </button>
          )}
        </CardContent>
      </Card>

      {/* Flag Preview */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-800">Preview Status Kehadiran</p>
              <p className="text-xs text-amber-600 mt-1">
                Berdasarkan jam saat ini: {new Date().getHours()}:{String(new Date().getMinutes()).padStart(2, "0")}
              </p>
            </div>
            <Badge
              variant={
                flagPreview.status === "ON_TIME"
                  ? "success"
                  : flagPreview.status === "LATE"
                  ? "warning"
                  : "destructive"
              }
              className="text-sm px-3 py-1"
            >
              {flagPreview.label}
            </Badge>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-emerald-100">
              <p className="text-xs text-emerald-700">≤ 08:15</p>
              <p className="text-sm font-semibold text-emerald-700">On Time</p>
            </div>
            <div className="p-2 rounded bg-amber-100">
              <p className="text-xs text-amber-700">08:16 - 09:00</p>
              <p className="text-sm font-semibold text-amber-700">Late</p>
            </div>
            <div className="p-2 rounded bg-red-100">
              <p className="text-xs text-red-700">09:01 - 12:00</p>
              <p className="text-sm font-semibold text-red-700">Very Late</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        {!todayStatus.hasClockedIn ? (
          <Button
            size="lg"
            onClick={handleClockIn}
            disabled={!canClockIn || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Memproses Clock In...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Clock In
              </>
            )}
          </Button>
        ) : !todayStatus.hasClockedOut ? (
          <Button
            size="lg"
            variant="outline"
            onClick={handleClockOut}
            disabled={!canClockOut || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Memproses Clock Out...
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5" />
                Clock Out
              </>
            )}
          </Button>
        ) : (
          <div className="p-4 rounded-xl bg-muted/50 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              ✓ Presensi hari ini sudah lengkap
            </p>
          </div>
        )}

        {!selfieFile && (
          <p className="text-xs text-center text-muted-foreground">
            Ambil foto selfie untuk clock in/out
          </p>
        )}
        {!location && (
          <p className="text-xs text-center text-muted-foreground">
            Dapatkan lokasi GPS untuk clock in/out
          </p>
        )}
      </div>

      {/* Last Action Result */}
      {lastAction && (
        <Card className={lastAction.success ? "border-emerald-200" : "border-red-200"}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {lastAction.success ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div>
                <p
                  className={`font-medium ${
                    lastAction.success ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {lastAction.type === "clock_in" ? "Clock In" : "Clock Out"}{" "}
                  {lastAction.success ? "Berhasil" : "Gagal"}
                </p>
                <p className="text-sm text-muted-foreground">{lastAction.message}</p>
                {lastAction.flag && (
                  <Badge variant="success" className="mt-2">
                    {lastAction.flag}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
