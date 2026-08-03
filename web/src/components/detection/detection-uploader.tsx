"use client";

import { useRef, useState } from "react";
import {
  CheckCircle2,
  ImageIcon,
  Loader2,
  ScanLine,
  Upload,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Detection = {
  class_label: string;
  confidence: number;
  bbox: [number, number, number, number];
};

type DetectResult = {
  total_objects: number;
  detections: Detection[];
  latency_ms: number;
  annotated_image?: string;
};

type LogEntry = {
  id: string;
  imageName: string;
  totalObjects: number;
  createdAt: string;
};

export function DetectionUploader({ history }: { history: LogEntry[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [filterClasses, setFilterClasses] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<DetectResult>();
  const [imageName, setImageName] = useState<string>();

  async function runDetection(file: File) {
    setLoading(true);
    setError(undefined);
    setResult(undefined);
    setImageName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const imageBase64 = btoa(binary);

      const res = await fetch("/api/ml/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          filterClasses: filterClasses.trim() || undefined,
          imageName: file.name,
          persist: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const data: DetectResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detection failed");
    } finally {
      setLoading(false);
    }
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPEG, PNG, etc.)");
      return;
    }
    runDetection(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  const grouped = result
    ? [...new Map(result.detections.map((d) => [d.class_label, d])).values()]
        .map((d) => ({
          label: d.class_label,
          count: result.detections.filter((x) => x.class_label === d.class_label)
            .length,
          maxConf: Math.max(
            ...result.detections
              .filter((x) => x.class_label === d.class_label)
              .map((x) => x.confidence),
          ),
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── Upload + result ── */}
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors ${
              dragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/40 hover:bg-muted/20"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {loading ? (
              <>
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Running YOLOv8…</p>
              </>
            ) : (
              <>
                <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-muted">
                  <Upload className="size-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Drop an image or click to browse
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    JPEG, PNG, WebP — detection runs via YOLOv8
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Filter classes */}
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="filter-classes">
                Filter classes{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="filter-classes"
                placeholder="e.g. bottle, cup, person"
                value={filterClasses}
                onChange={(e) => setFilterClasses(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              {error.toLowerCase().includes("offline") ? (
                <WifiOff className="mt-0.5 size-4 shrink-0 text-destructive" />
              ) : null}
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* Annotated image */}
          {result?.annotated_image && (
            <div className="overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.annotated_image}
                alt={`Annotated: ${imageName}`}
                className="w-full object-contain"
              />
            </div>
          )}
        </div>

        {/* ── Results panel ── */}
        <div className="space-y-4">
          {result ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  Detection complete
                </CardTitle>
                <CardDescription>
                  {result.total_objects} object
                  {result.total_objects !== 1 ? "s" : ""} · {result.latency_ms}
                  ms
                </CardDescription>
              </CardHeader>
              <CardContent>
                {grouped.length > 0 ? (
                  <div className="space-y-2">
                    {grouped.map((g) => (
                      <div
                        key={g.label}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="capitalize">{g.label}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{g.count}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {(g.maxConf * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No objects detected in this image.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <ScanLine className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Upload an image to see detections here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Detection history ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ImageIcon className="size-4" />
            Detection history
          </CardTitle>
          <CardDescription>Recent saved scans for this workspace</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead className="text-right">Objects</TableHead>
                <TableHead className="text-right">Scanned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">
                    {log.imageName}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {log.totalObjects}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No scans yet — upload an image above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
