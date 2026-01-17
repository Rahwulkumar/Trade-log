"use client";

import { useState, useRef, useCallback } from "react";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScreenshotUploadProps {
  screenshots: string[];
  onScreenshotsChange: (screenshots: string[]) => void;
  onUpload: (file: File) => Promise<string>;
  onDelete?: (path: string) => Promise<void>;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

export function ScreenshotUpload({
  screenshots,
  onScreenshotsChange,
  onUpload,
  onDelete,
  maxFiles = 5,
  disabled = false,
  className,
}: ScreenshotUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const newScreenshots: string[] = [...screenshots];
      
      for (let i = 0; i < files.length; i++) {
        if (newScreenshots.length >= maxFiles) {
          setUploadError(`Maximum ${maxFiles} screenshots allowed`);
          break;
        }

        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setUploadError(`${file.name} is not an image file`);
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setUploadError(`${file.name} is too large (max 5MB)`);
          continue;
        }

        const path = await onUpload(file);
        newScreenshots.push(path);
      }

      onScreenshotsChange(newScreenshots);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [screenshots, onUpload, onScreenshotsChange, maxFiles, disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const handleRemove = useCallback(async (index: number) => {
    const path = screenshots[index];
    
    if (onDelete) {
      try {
        await onDelete(path);
      } catch (err) {
        console.error("Failed to delete screenshot:", err);
        // Continue with removal even if delete fails
      }
    }

    const newScreenshots = screenshots.filter((_, i) => i !== index);
    onScreenshotsChange(newScreenshots);
  }, [screenshots, onScreenshotsChange, onDelete]);

  const canUpload = !disabled && screenshots.length < maxFiles;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop Zone */}
      {canUpload && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors",
            "flex flex-col items-center justify-center gap-2 min-h-[100px]",
            isDragging
              ? "border-cyan-500 bg-cyan-500/10"
              : "border-white/20 hover:border-white/40 hover:bg-white/5",
            isUploading && "pointer-events-none opacity-60"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isUploading}
          />
          
          {isUploading ? (
            <>
              <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
              <span className="text-sm text-muted-foreground">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground text-center">
                Drop screenshots here or click to upload
              </span>
              <span className="text-xs text-white/30">
                Max {maxFiles} images, up to 5MB each
              </span>
            </>
          )}
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <p className="text-sm text-red-500">{uploadError}</p>
      )}

      {/* Screenshot Previews */}
      {screenshots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {screenshots.map((path, index) => (
            <ScreenshotThumbnail
              key={path}
              path={path}
              onRemove={() => handleRemove(index)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ScreenshotThumbnailProps {
  path: string;
  onRemove: () => void;
  disabled?: boolean;
}

function ScreenshotThumbnail({ path, onRemove, disabled }: ScreenshotThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Construct the Supabase storage URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const imageUrl = `${supabaseUrl}/storage/v1/object/public/trade-screenshots/${path}`;

  return (
    <div className="relative group">
      <div className="w-20 h-20 rounded-lg overflow-hidden border border-white/10 bg-void">
        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          </div>
        )}
        {error ? (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        ) : (
          <img
            src={imageUrl}
            alt="Trade screenshot"
            className={cn(
              "w-full h-full object-cover transition-opacity",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError(true);
            }}
          />
        )}
      </div>
      
      {/* Remove Button */}
      {!disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
