"use client";

import { useState, useCallback, useRef } from "react";
import type { AttachedImage } from "@/types/chat";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

async function resizeImage(file: File, maxPx = 2048): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Encode failed")),
        file.type === "image/png" ? "image/png" : "image/jpeg",
        0.92
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Load failed")); };
    img.src = url;
  });
}

async function fileToAttached(file: File): Promise<AttachedImage> {
  const mimeType = ACCEPTED_TYPES.includes(file.type) ? file.type : "image/jpeg";
  const blob = file.size > 1.5 * 1024 * 1024
    ? await resizeImage(file)
    : file;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve({ dataUrl, base64, mimeType, name: file.name });
    };
    reader.onerror = () => reject(new Error("Read failed"));
    reader.readAsDataURL(blob);
  });
}

export interface UseImageUploadReturn {
  image: AttachedImage | null;
  isDragging: boolean;
  error: string | null;
  attach: (file: File) => Promise<void>;
  clear: () => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  openFilePicker: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useImageUpload(): UseImageUploadReturn {
  const [image, setImage] = useState<AttachedImage | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const attach = useCallback(async (file: File) => {
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Unsupported format. Use JPEG, PNG, GIF, or WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File too large. Max 10 MB.");
      return;
    }
    try {
      const attached = await fileToAttached(file);
      setImage(attached);
    } catch {
      setError("Could not read the image. Please try again.");
    }
  }, []);

  const clear = useCallback(() => {
    setImage(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) await attach(file);
    },
    [attach]
  );

  const onPaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (file) await attach(file);
    },
    [attach]
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    image, isDragging, error,
    attach, clear,
    onDragEnter, onDragLeave, onDragOver, onDrop, onPaste,
    openFilePicker, fileInputRef,
  };
}
