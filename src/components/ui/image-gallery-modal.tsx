'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface GalleryImage {
  url: string;
  alt_text?: string;
  caption?: string;
}

interface ImageGalleryModalProps {
  images: GalleryImage[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageGalleryModal({ 
  images, 
  initialIndex, 
  isOpen, 
  onClose,
}: ImageGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset state when modal opens/closes or initial index changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      setRotation(0);
      setImageLoaded(false);
    }
  }, [isOpen, initialIndex]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setIsZoomed(false);
    setRotation(0);
    setImageLoaded(false);
  }, [images.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setIsZoomed(false);
    setRotation(0);
    setImageLoaded(false);
  }, [images.length]);

  const toggleZoom = useCallback(() => {
    setIsZoomed(!isZoomed);
  }, [isZoomed]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case ' ':
          e.preventDefault();
          toggleZoom();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToPrevious, goToNext, onClose, toggleZoom]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const downloadImage = async () => {
    try {
      const response = await fetch(images[currentIndex].url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `image-${currentIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      // Silent error handling - don't log to console
    }
  };

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm">
      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2 text-white">
            <span className="text-sm font-medium">
              {currentIndex + 1} of {images.length}
            </span>
            {currentImage.caption && (
              <span className="text-sm text-white/80 max-w-md truncate">
                {currentImage.caption}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleZoom}
              className="text-white hover:bg-white/20"
            >
              {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={rotateImage}
              className="text-white hover:bg-white/20"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadImage}
              className="text-white hover:bg-white/20"
            >
              <Download className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="lg"
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12 rounded-full"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <Button
            variant="ghost"
            size="lg"
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12 rounded-full"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </>
      )}

      {/* Main Image Container */}
      <div 
        className="flex items-center justify-center h-full p-16 cursor-pointer"
        onClick={toggleZoom}
      >
        <div className={cn(
          'relative transition-all duration-300 ease-out',
          isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
        )}>
          <div 
            className="relative transition-transform duration-300"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <Image
              src={currentImage.url}
              alt={currentImage.alt_text || `Gallery image ${currentIndex + 1}`}
              width={1200}
              height={800}
              className={cn(
                'max-w-full max-h-full object-contain transition-opacity duration-300',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setImageLoaded(true)}
              priority
            />
            
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex items-center justify-center gap-2 p-4 overflow-x-auto scrollbar-thin">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsZoomed(false);
                  setRotation(0);
                  setImageLoaded(false);
                }}
                className={cn(
                  'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200',
                  index === currentIndex 
                    ? 'border-primary ring-2 ring-primary/50' 
                    : 'border-white/30 hover:border-white/60'
                )}
              >
                <Image
                  src={image.url}
                  alt={image.alt_text || `Thumbnail ${index + 1}`}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      <div 
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
} 