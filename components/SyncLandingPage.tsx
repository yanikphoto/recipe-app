import React from 'react';

const SyncLandingPage: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[#F9F9F5] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-lg max-w-sm w-full">
        <div className="w-20 h-20 mx-auto bg-[#D4F78F] rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Prêt à synchroniser !</h1>
        <p className="text-gray-600 mt-4">
          Pour importer vos recettes, veuillez ouvrir l'application <strong className="font-semibold">"Nos Recettes"</strong> directement depuis l'écran d'accueil de votre appareil.
        </p>
        <p className="text-gray-500 text-sm mt-6">
          L'invitation à importer les données apparaîtra automatiquement. Vous pouvez fermer cette page.
        </p>
      </div>
    </div>
  );
};

export default SyncLandingPage;
