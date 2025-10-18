import React, { useState, useEffect } from 'react';
import { imageStore } from '../services/imageStore';

const API_BASE_URL = 'https://deafening-gaye-yanik-dfb7fb04.koyeb.app';

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
        const localBlob = await imageStore.getImage(imageId);
        if (localBlob) {
          objectUrl = URL.createObjectURL(localBlob);
          setImageUrl(objectUrl);
        } else {
          // Image not found locally, fetch from the server.
          const serverImageUrl = `${API_BASE_URL}/uploads/${imageId}.jpg`;
          const response = await fetch(serverImageUrl);
          if (response.ok) {
            const serverBlob = await response.blob();
            // Store the fetched image locally for next time.
            await imageStore.saveImage(imageId, serverBlob);
            objectUrl = URL.createObjectURL(serverBlob);
            setImageUrl(objectUrl);
          } else {
            console.warn(`Image with id ${imageId} not found locally or on server.`);
            setImageUrl(fallbackImage);
          }
        }
      } catch (error) {
        console.error("Failed to load image:", error);
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