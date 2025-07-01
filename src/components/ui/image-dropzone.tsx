'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface MediaAsset {
  id: string;
  filename: string;
  original_filename?: string;
  mime_type?: string;
  size_bytes?: number;
  width?: number;
  height?: number;
  storage_path: string;
  thumbnail_path?: string;
  blurhash?: string;
  uploaded_by?: string;
  created_at: Date;
  // Computed URLs
  url: string;
  thumbnail_url: string;
  alt?: string;
  caption?: string;
}

interface ImageDropzoneProps {
  onUpload: (assets: MediaAsset[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
  disabled?: boolean;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  asset?: MediaAsset;
}

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  onUpload,
  multiple = true,
  maxFiles = 10,
  maxSize = 10, // 10MB default
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  className = '',
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList) => {
    if (disabled) return;

    const validateFile = (file: File): string | null => {
      if (!acceptedTypes.includes(file.type)) {
        return `File type ${file.type} is not supported. Please use: ${acceptedTypes.join(', ')}`;
      }
      
      if (file.size > maxSize * 1024 * 1024) {
        return `File size must be less than ${maxSize}MB`;
      }
      
      return null;
    };

    const fileArray = Array.from(files);
    
    // Validate file count
    if (!multiple && fileArray.length > 1) {
      toast.error('Only one file is allowed');
      return;
    }
    
    if (fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      if (validFiles.length === 0) return;
    }

    // Initialize uploading state
    const uploadingFileStates: UploadingFile[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading',
    }));

    setUploadingFiles(uploadingFileStates);
    setIsUploading(true);

    try {
      // Create FormData
      const formData = new FormData();
      validFiles.forEach(file => {
        formData.append('files', file);
      });

      // Upload files
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      const uploadedAssets: MediaAsset[] = result.assets || [];

      // Update uploading states to success
      setUploadingFiles(prev => 
        prev.map((uploadingFile, index) => ({
          ...uploadingFile,
          progress: 100,
          status: 'success',
          asset: uploadedAssets[index],
        }))
      );

      // Call onUpload callback
      onUpload(uploadedAssets);

      toast.success(`Successfully uploaded ${uploadedAssets.length} file${uploadedAssets.length > 1 ? 's' : ''}`);

      // Clear uploading state after a delay
      setTimeout(() => {
        setUploadingFiles([]);
        setIsUploading(false);
      }, 2000);

    } catch {
      // Silent error handling - don't log to console
      
      // Update uploading states to error
      setUploadingFiles(prev => 
        prev.map(uploadingFile => ({
          ...uploadingFile,
          status: 'error',
          error: 'Upload failed',
        }))
      );

      toast.error('Failed to upload files');
      
      // Clear error state after delay
      setTimeout(() => {
        setUploadingFiles([]);
        setIsUploading(false);
      }, 3000);
    }
  }, [disabled, multiple, maxFiles, maxSize, acceptedTypes, onUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, handleFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFiles]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const removeUploadingFile = useCallback((index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
    if (uploadingFiles.length === 1) {
      setIsUploading(false);
    }
  }, [uploadingFiles.length]);

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dropzone */}
      <Card
        className={cn(
          'relative border-2 border-dashed transition-all duration-200 cursor-pointer',
          'hover:border-primary/50 hover:bg-primary/5',
          isDragOver && 'border-primary bg-primary/10',
          disabled && 'opacity-50 cursor-not-allowed',
          isUploading && 'pointer-events-none'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className={cn(
              'p-4 rounded-full transition-colors',
              isDragOver ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
              <Upload className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                {isDragOver ? 'Drop images here' : 'Upload Images'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop images here, or click to select files
              </p>
              <p className="text-xs text-muted-foreground">
                Supports: {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} • 
                Max {maxSize}MB per file • 
                {multiple ? `Up to ${maxFiles} files` : 'Single file only'}
              </p>
            </div>

            {!isUploading && (
              <Button variant="outline" size="sm" className="mt-4">
                <ImageIcon className="w-4 h-4 mr-2" />
                Select Files
              </Button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
      </Card>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            {isUploading ? 'Uploading...' : 'Upload Complete'}
          </h4>
          
          {uploadingFiles.map((uploadingFile, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {uploadingFile.status === 'uploading' && (
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                  {uploadingFile.status === 'success' && (
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  )}
                  {uploadingFile.status === 'error' && (
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">
                      {uploadingFile.file.name}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(uploadingFile.file.size)}
                    </span>
                  </div>
                  
                  {uploadingFile.status === 'uploading' && (
                    <div className="mt-1">
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div 
                          className="bg-primary h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadingFile.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {uploadingFile.status === 'error' && uploadingFile.error && (
                    <p className="text-xs text-red-600 mt-1">
                      {uploadingFile.error}
                    </p>
                  )}
                  
                  {uploadingFile.status === 'success' && (
                    <p className="text-xs text-green-600 mt-1">
                      Upload successful
                    </p>
                  )}
                </div>

                {uploadingFile.status !== 'uploading' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeUploadingFile(index);
                    }}
                    className="flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}; 