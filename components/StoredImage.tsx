import React, { useState, useEffect } from 'react';
import { imageStore } from '../services/imageStore';

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

    const loadImage = async () => {
      setIsLoading(true);
      if (!imageId) {
        setImageUrl(fallbackImage);
        setIsLoading(false);
        return;
      }
      
      // Handle legacy base64 or external URLs
      if (imageId.startsWith('data:') || imageId.startsWith('http')) {
        setImageUrl(imageId);
        setIsLoading(false);
        return;
      }

      try {
        const blob = await imageStore.getImage(imageId);
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl);
        } else {
          console.warn(`Image with id ${imageId} not found in IndexedDB.`);
          setImageUrl(fallbackImage);
        }
      } catch (error) {
        console.error("Failed to load image from IndexedDB", error);
        setImageUrl(fallbackImage);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageId]);

  if (isLoading) {
    return <div className={`${className} bg-gray-200 animate-pulse`}></div>;
  }

  return <img src={imageUrl} alt={alt} className={className} />;
};

export default StoredImage;
