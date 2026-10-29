"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  QrCode,
  Search,
  Wifi,
  XCircle,
} from "lucide-react";
import { ScanValidationResult } from "@/services/tickets/ticket-service";

interface ScanHistoryEntry {
  id: string;
  scannedInputRef: string;
  gateName: string;
  outcome: string;
  message: string;
  scannedAt: string;
  ticket?: { ticketNumber: string; holderName: string } | null;
}

export function ScannerConsoleClient({
  events,
  operatorName,
  isDevMode,
}: {
  events: Array<{ id: string; title: string; kickoffIso: string }>;
  operatorName: string;
  isDevMode: boolean;
}) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || "");
  const [gateName, setGateName] = useState("Gate 1 — Main Turnstile");
  const [manualInput, setManualInput] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [lastResult, setLastResult] = useState<ScanValidationResult | null>(
    null
  );
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScannedCodeRef = useRef<{ code: string; at: number }>({
    code: "",
    at: 0,
  });

  const loadHistory = useCallback(async (evId: string) => {
    if (!evId) return;
    try {
      const res = await fetch(
        `/api/scanner/validate?eventId=${encodeURIComponent(evId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setHistory(data.scans || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadHistory(selectedEventId);
  }, [selectedEventId, loadHistory]);

  const submitValidation = useCallback(
    async (inputCode: string) => {
      if (!selectedEventId || !inputCode.trim()) return;
      setValidating(true);
      try {
        const res = await fetch("/api/scanner/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: selectedEventId,
            scannedInput: inputCode.trim(),
            gateName,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setLastResult({
            valid: false,
            outcome: "INVALID_TICKET",
            message: data.error || "Scanner validation request failed.",
            scannedAt: new Date().toISOString(),
          });
        } else {
          setLastResult(data as ScanValidationResult);
        }
        await loadHistory(selectedEventId);
      } catch (err) {
        setLastResult({
          valid: false,
          outcome: "INVALID_TICKET",
          message:
            err instanceof Error
              ? err.message
              : "Network error — live online connection required.",
          scannedAt: new Date().toISOString(),
        });
      } finally {
        setValidating(false);
      }
    },
    [selectedEventId, gateName, loadHistory]
  );

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      const scanFrame = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qr = jsQR(imgData.data, imgData.width, imgData.height);
            if (qr && qr.data) {
              const now = Date.now();
              if (
                qr.data !== lastScannedCodeRef.current.code ||
                now - lastScannedCodeRef.current.at > 3500
              ) {
                lastScannedCodeRef.current = { code: qr.data, at: now };
                submitValidation(qr.data);
              }
            }
          }
        }
        rafRef.current = requestAnimationFrame(scanFrame);
      };

      rafRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      setCameraError(
        err instanceof Error
          ? `Camera unavailable (${err.message}). Use manual ticket-reference lookup below.`
          : "Camera access denied. Use manual lookup."
      );
      setCameraActive(false);
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualInput.trim()) return;
    submitValidation(manualInput);
    setManualInput("");
  }

  return (
    <div className="space-y-6">
      {/* Scanner Operator Bar */}
      <div className="t254-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#35D399] font-semibold">
            <Wifi className="h-3.5 w-3.5" />
            <span>Live Online Atomic Database Validation Active</span>
          </div>
          <p className="text-xs text-[#94A3B8]">
            Authenticated Operator:{" "}
            <strong className="text-[#F8FAFC]">{operatorName}</strong> • Requires
            active network connection to prevent multi-gate duplicate entry.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[320px]">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            aria-label="Target Match Event"
            className="t254-input text-xs"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>

          <input
            value={gateName}
            onChange={(e) => setGateName(e.target.value)}
            aria-label="Gate Name"
            placeholder="Gate Name"
            className="t254-input text-xs"
          />
        </div>
      </div>

      {/* LARGE SUCCESS / FAILURE BANNER */}
      {lastResult && (
        <div
          role="status"
          className={`rounded-2xl border-2 p-6 sm:p-8 transition-all ${
            lastResult.valid
              ? "border-[#35D399] bg-[#35D399]/15"
              : "border-rose-500 bg-rose-500/15"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            {lastResult.valid ? (
              <CheckCircle2 className="h-16 w-16 text-[#35D399] shrink-0" />
            ) : (
              <XCircle className="h-16 w-16 text-rose-400 shrink-0" />
            )}

            <div className="flex-1 space-y-1">
              <span
                className={`inline-block rounded-full px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider ${
                  lastResult.valid
                    ? "bg-[#35D399] text-[#0B1020]"
                    : "bg-rose-500 text-white"
                }`}
              >
                {lastResult.outcome.replace(/_/g, " ")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">
                {lastResult.valid ? "ADMIT ATTENDEE" : "DO NOT ADMIT"}
              </h2>
              <p className="text-sm text-[#F8FAFC]">{lastResult.message}</p>

              {lastResult.ticket && (
                <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-[#CBD5E1]">
                  <span>
                    Ticket:{" "}
                    <strong className="font-mono">
                      {lastResult.ticket.ticketNumber}
                    </strong>
                  </span>
                  <span>
                    Category: <strong>{lastResult.ticket.categoryName}</strong>
                  </span>
                  <span>
                    Holder: <strong>{lastResult.ticket.holderName}</strong>
                  </span>
                  {lastResult.ticket.seatInfo && (
                    <span>
                      Seat: <strong>{lastResult.ticket.seatInfo}</strong>
                    </span>
                  )}
                </div>
              )}

              <p className="text-[11px] text-[#94A3B8] pt-1">
                Scan Timestamp: {lastResult.scannedAt}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Camera + Manual Lookup */}
        <div className="lg:col-span-6 space-y-5">
          <div className="t254-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <QrCode className="h-5 w-5 text-[#35D399]" />
                Camera QR Turnstile Scanner
              </h3>
              {cameraActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="t254-btn-secondary text-xs py-1.5 px-3"
                >
                  <CameraOff className="h-3.5 w-3.5" />
                  Stop Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="t254-btn-primary text-xs py-1.5 px-3"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Start Camera
                </button>
              )}
            </div>

            {cameraError && (
              <p className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                {cameraError}
              </p>
            )}

            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#293548] bg-[#0B1020] flex items-center justify-center">
              <video
                ref={videoRef}
                muted
                playsInline
                className={`h-full w-full object-cover ${cameraActive ? "block" : "hidden"}`}
              />
              <canvas ref={canvasRef} className="hidden" />
              {!cameraActive && (
                <p className="text-xs text-[#94A3B8] px-6 text-center">
                  Click &quot;Start Camera&quot; to scan optical QR codes, or
                  enter a ticket reference manually below.
                </p>
              )}
            </div>
          </div>

          <form
            onSubmit={handleManualSubmit}
            className="t254-card p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-[#F8FAFC]">
              Manual Ticket-Reference or QR Token Lookup
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="e.g. TKT-DEMO01-001 or T254.v1...."
                className="t254-input font-mono"
              />
              <button
                type="submit"
                disabled={validating || !manualInput.trim()}
                className="t254-btn-primary shrink-0"
              >
                <Search className="h-4 w-4" />
                Validate
              </button>
            </div>

            {isDevMode && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#94A3B8]">
                <span>Demo quick test:</span>
                <button
                  type="button"
                  onClick={() => submitValidation("TKT-DEMO01-001")}
                  className="rounded-lg border border-[#35D399]/40 bg-[#35D399]/10 px-2.5 py-1 text-[#35D399] hover:bg-[#35D399]/20"
                >
                  Scan Seed Valid (TKT-DEMO01-001)
                </button>
                <button
                  type="button"
                  onClick={() => submitValidation("TKT-DEMO01-002")}
                  className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-amber-300 hover:bg-amber-500/20"
                >
                  Scan Already-Used (TKT-DEMO01-002)
                </button>
                <button
                  type="button"
                  onClick={() => submitValidation("TKT-FAKE-999")}
                  className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-2.5 py-1 text-rose-300 hover:bg-rose-500/20"
                >
                  Scan Invalid
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Live Scan History */}
        <div className="lg:col-span-6">
          <div className="t254-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#60A5FA]" />
                Recent Gate Scan History ({history.length})
              </h3>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-[#94A3B8] py-8 text-center">
                No scans recorded for this match yet.
              </p>
            ) : (
              <div className="divide-y divide-[#293548] max-h-[460px] overflow-y-auto">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            item.outcome === "ACCEPTED"
                              ? "bg-[#35D399]/15 text-[#35D399]"
                              : "bg-rose-500/15 text-rose-300"
                          }`}
                        >
                          {item.outcome}
                        </span>
                        <span className="font-mono font-bold text-[#F8FAFC]">
                          {item.ticket?.ticketNumber || item.scannedInputRef}
                        </span>
                      </div>
                      <p className="text-[#94A3B8]">{item.message}</p>
                    </div>
                    <div className="text-right text-[11px] text-[#94A3B8] shrink-0">
                      <p>{item.gateName}</p>
                      <p>{item.scannedAt.slice(11, 19)} UTC</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
