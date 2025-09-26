import React, { useRef } from 'react';

type ChangeImageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onImageSelected: (base64Image: string) => void;
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const ChangeImageModal: React.FC<ChangeImageModalProps> = ({ isOpen, onClose, onImageSelected }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        onImageSelected(base64);
      } catch (error) {
        console.error("Error converting file to base64", error);
        // Optionally show an error to the user here
      }
    }
    if (event.target) {
        event.target.value = ''; // Reset file input to allow selecting the same file again
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={onClose}>
      <div
        className="bg-white rounded-3xl p-6 m-4 max-w-sm w-full shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Changer l'image</h2>
        <div className="space-y-4">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full flex items-center justify-center text-left p-4 bg-[#D4F78F] text-gray-800 font-semibold rounded-2xl shadow-sm hover:bg-[#BDEE63] transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Prendre une photo
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center text-left p-4 bg-gray-200 text-gray-800 font-semibold rounded-2xl shadow-sm hover:bg-gray-300 transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Télécharger une image
          </button>
        </div>
        <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" ref={cameraInputRef} />
        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
      </div>
    </div>
  );
};

export default ChangeImageModal;
