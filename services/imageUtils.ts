// services/imageUtils.ts
const MAX_DIMENSION = 1024;
const TARGET_MIME_TYPE = 'image/jpeg';
const IMAGE_QUALITY = 0.8;

/**
 * Takes an image source (like a data URL) and returns a resized and compressed version.
 * @param imageSrc The source of the image to process.
 * @returns A promise that resolves to an object containing the new dataUrl and base64 string.
 */
export const processImage = (imageSrc: string): Promise<{ dataUrl: string, base64: string }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;
            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                if (width > height) {
                    height = Math.round((height * MAX_DIMENSION) / width);
                    width = MAX_DIMENSION;
                } else {
                    width = Math.round((width * MAX_DIMENSION) / height);
                    height = MAX_DIMENSION;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error("Could not create canvas context."));
            
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL(TARGET_MIME_TYPE, IMAGE_QUALITY);
            const base64 = dataUrl.split(',')[1];
            if (!base64) return reject(new Error("Could not extract base64 data from canvas."));
            
            resolve({ dataUrl, base64 });
        };
        img.onerror = (error) => reject(new Error(`Image failed to load for processing: ${error}`));
        img.src = imageSrc;
    });
};

/**
 * Reads a File object and converts it into a data URL.
 * @param file The file to read.
 * @returns A promise that resolves to the data URL string.
 */
export const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};
