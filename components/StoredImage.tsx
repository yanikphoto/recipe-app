import React, { useState, useEffect } from 'react';
import { firestoreSync } from '../services/firestoreSync';

type StoredImageProps = {
  imageId: string;
  alt: string;
  className?: string;
};

const StoredImage: React.FC<StoredImageProps> = ({ imageId, alt, className }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const fallbackImage = 'https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=2940&auto=format&fit=crop';

  useEffect(() => {
    let objectUrl: string | undefined;
    let isCancelled = false;

    const loadImage = async () => {
      setIsLoading(true);
      if (!imageId || typeof imageId !== 'string') {
        setImageUrl(fallbackImage);
        setIsLoading(false);
        return;
      }
      
      if (imageId.startsWith('data:') || imageId.startsWith('http')) {
        setImageUrl(imageId);
        setIsLoading(false);
        return;
      }

      try {
        const blob = await firestoreSync.getImage(imageId);
        if (!isCancelled) {
          if (blob) {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            objectUrl = URL.createObjectURL(blob);
            setImageUrl(objectUrl);
          } else {
            setImageUrl(fallbackImage);
          }
        }
      } catch (error) {
        if (!isCancelled) setImageUrl(fallbackImage);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadImage();

    return () => {
      isCancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  return (
    <div className={`relative ${className || ''}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <img
        src={imageUrl}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} ${className || ''}`}
        onError={() => setImageUrl(fallbackImage)}
      />
    </div>
  );
};

export default StoredImage;
