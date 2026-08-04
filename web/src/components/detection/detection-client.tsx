"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, ImageUp, History, Play, Square, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type Detection = {
  class_label: string;
  confidence: number;
  bbox: [number, number, number, number];
};

type HistoryRow = {
  id: string;
  imageName: string;
  totalObjects: number;
  detections: unknown;
  createdAt: Date;
};

const CLASS_COLORS = [
  "#22d3ee",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#60a5fa",
  "#fb7185",
  "#4ade80",
  "#f97316",
  "#c084fc",
];

function colorFor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return CLASS_COLORS[hash % CLASS_COLORS.length];
}

function formatTime(iso: Date | string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function classCounts(detections: Detection[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of detections) {
    map.set(d.class_label, (map.get(d.class_label) ?? 0) + 1);
  }
  return map;
}

async function runDetection(
  imageBase64: string,
  opts: { persist?: boolean; imageName?: string } = {},
): Promise<{ detections: Detection[]; latency_ms: number }> {
  const res = await fetch("/api/ml/detect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, persist: opts.persist ?? false, imageName: opts.imageName }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Detection failed");
  return json;
}

export function DetectionClient({ history }: { history: HistoryRow[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const busyRef = useRef(false);
  const lastDetectionsRef = useRef<Detection[]>([]);

  const [streaming, setStreaming] = useState(false);
  const [fps, setFps] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [frameLatency, setFrameLatency] = useState(0);
  const [detectionCount, setDetectionCount] = useState(0);
  const [liveCounts, setLiveCounts] = useState<Map<string, number>>(new Map());

  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    detections: Detection[];
    annotated: string | null;
    latency: number;
  } | null>(null);

  const drawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || video.clientWidth || 640;
    const h = rect.height || video.clientHeight || 480;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    for (const d of lastDetectionsRef.current) {
      const [bx, by, bw, bh] = d.bbox;
      const sx = w / video.videoWidth;
      const sy = h / video.videoHeight;
      const color = colorFor(d.class_label);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx * sx, by * sy, bw * sx, bh * sy);
      const label = `${d.class_label} ${(d.confidence * 100).toFixed(0)}%`;
      ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = color;
      ctx.fillRect(bx * sx, by * sy - 20, tw, 18);
      ctx.fillStyle = "#0b0f19";
      ctx.fillText(label, bx * sx + 6, by * sy - 6);
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    cancelAnimationFrame(rafRef.current);
    lastDetectionsRef.current = [];
    setStreaming(false);
    setDetectionCount(0);
    setLiveCounts(new Map());
    if (overlayRef.current) {
      overlayRef.current.getContext("2d")?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }
  }, []);

  const startStream = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      let last = performance.now();
      let fpsSamples = 0;
      let fpsAcc = 0;
      let lastSend = 0;

      setStreaming(true);
      const tick = (now: number) => {
        rafRef.current = requestAnimationFrame(tick);
        const delta = now - last;
        last = now;
        fpsAcc += delta;
        fpsSamples++;
        if (fpsAcc >= 1000) {
          setFps(Math.round((fpsSamples * 1000) / fpsAcc));
          fpsAcc = 0;
          fpsSamples = 0;
        }

        if (!video || !video.videoWidth || busyRef.current) return;
        if (now - lastSend < 420) return;
        lastSend = now;

        const cap = document.createElement("canvas");
        const scale = 640 / video.videoWidth;
        cap.width = 640;
        cap.height = Math.round(video.videoHeight * scale);
        const cctx = cap.getContext("2d");
        if (!cctx) return;
        cctx.drawImage(video, 0, 0, cap.width, cap.height);
        const dataUrl = cap.toDataURL("image/jpeg", 0.6);
        const base64 = dataUrl.split(",")[1];

        busyRef.current = true;
        runDetection(base64)
          .then((res) => {
            lastDetectionsRef.current = res.detections;
            setDetectionCount(res.detections.length);
            setLiveCounts(classCounts(res.detections));
            setFrameLatency(res.latency_ms);
            drawOverlay();
          })
          .catch(() => {
            /* transient network error, keep streaming */
          })
          .finally(() => {
            busyRef.current = false;
          });
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setCameraError(
        "Camera unavailable. Allow camera permission or try the upload tab.",
      );
    }
  }, [drawOverlay]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      setUploadPreview(dataUrl);
      setUploading(true);
      setUploadResult(null);
      try {
        const res = await runDetection(dataUrl.split(",")[1], {
          persist: true,
          imageName: file.name,
        });
        const detections = res.detections as Detection[];
        setUploadResult({
          detections,
          annotated: null,
          latency: res.latency_ms,
        });
        toast.success(`Detected ${detections.length} object${detections.length === 1 ? "" : "s"}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Detection failed");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadDetections = uploadResult?.detections ?? [];

  return (
    <Tabs defaultValue="live" className="space-y-4">
      <TabsList>
        <TabsTrigger value="live">
          <Camera className="mr-2 size-4" />
          Live camera
        </TabsTrigger>
        <TabsTrigger value="upload">
          <ImageUp className="mr-2 size-4" />
          Upload image
        </TabsTrigger>
        <TabsTrigger value="history">
          <History className="mr-2 size-4" />
          History
        </TabsTrigger>
      </TabsList>

      <TabsContent value="live" className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
              {!streaming && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <ScanLine className="size-8" />
                  <p className="text-sm">Camera is off</p>
                  {cameraError && (
                    <p className="max-w-sm px-4 text-center text-xs text-destructive">{cameraError}</p>
                  )}
                </div>
              )}
              <video
                ref={videoRef}
                playsInline
                muted
                className={cn("h-full w-full object-contain", !streaming && "opacity-0")}
              />
              <canvas
                ref={overlayRef}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
              {streaming && (
                <div className="absolute left-3 top-3 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-xs text-emerald-400">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                    LIVE
                  </span>
                  <span className="rounded-md bg-black/60 px-2 py-1 text-xs text-muted-foreground">{fps} fps</span>
                  {frameLatency > 0 && (
                    <span className="rounded-md bg-black/60 px-2 py-1 text-xs text-muted-foreground">{frameLatency} ms</span>
                  )}
                </div>
              )}
              {streaming && (
                <div className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-1 text-sm font-semibold text-cyan-300">
                  {detectionCount} object{detectionCount === 1 ? "" : "s"}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {!streaming ? (
                <Button onClick={startStream}>
                  <Play className="mr-2 size-4" />
                  Start camera
                </Button>
              ) : (
                <Button variant="destructive" onClick={stopStream}>
                  <Square className="mr-2 size-4" />
                  Stop camera
                </Button>
              )}
              <div className="ml-auto flex flex-wrap gap-2">
                {[...liveCounts.entries()].map(([label, count]) => (
                  <Badge key={label} variant="outline" className="gap-1">
                    <span className="size-2 rounded-full" style={{ backgroundColor: colorFor(label) }} />
                    {label} × {count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="upload" className="space-y-4">
        <Card>
          <CardContent className="grid gap-4 pt-6 lg:grid-cols-2">
            <div>
              <label
                htmlFor="image-upload"
                className={cn(
                  "flex aspect-video cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground",
                )}
              >
                {uploading ? (
                  <Skeleton className="h-8 w-8 rounded-full" />
                ) : (
                  <ImageUp className="size-8" />
                )}
                <span className="text-sm">Click to choose an image</span>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />
              </label>
              {uploadPreview && (
                <div className="relative mt-4 overflow-hidden rounded-xl border border-border">
                  <Image src={uploadPreview} alt="Upload preview" width={640} height={480} className="h-auto w-full object-contain" />
                </div>
              )}
            </div>

            <div>
              {uploading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : uploadDetections.length > 0 ? (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium">Detected objects</h3>
                    <Badge variant="secondary">{uploadDetections.length} found</Badge>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {[...classCounts(uploadDetections).entries()].map(([label, count]) => (
                      <Badge key={label} variant="outline" className="gap-1">
                        <span className="size-2 rounded-full" style={{ backgroundColor: colorFor(label) }} />
                        {label} × {count}
                      </Badge>
                    ))}
                  </div>
                  <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead className="text-right">Confidence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadDetections.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">
                              <span className="mr-2 inline-block size-2 rounded-full" style={{ backgroundColor: colorFor(d.class_label) }} />
                              {d.class_label}
                            </TableCell>
                            <TableCell className="text-right">
                              {(d.confidence * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-40 items-center justify-center text-sm text-muted-foreground">
                  {uploadPreview ? "Nothing detected in this image." : "Run a detection to see results here."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent detections</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No detection history yet. Run an upload detection to log one.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead className="text-right">Objects</TableHead>
                      <TableHead>Labels</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((row) => {
                      const dets = (row.detections as unknown as Detection[]) ?? [];
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="max-w-56 truncate font-medium">{row.imageName}</TableCell>
                          <TableCell className="text-right">{row.totalObjects}</TableCell>
                          <TableCell>
                            <div className="flex max-w-md flex-wrap gap-1">
                              {[...classCounts(dets).entries()].slice(0, 6).map(([label, count]) => (
                                <Badge key={label} variant="secondary" className="gap-1 text-[10px]">
                                  <span className="size-1.5 rounded-full" style={{ backgroundColor: colorFor(label) }} />
                                  {label} ×{count}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatTime(row.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
