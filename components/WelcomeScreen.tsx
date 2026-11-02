import React, { useState, useRef } from 'react';
import { Screen, Recipe, GroceryListItem } from '../types';
import { exportRecipesToWord, exportBackupJsonWithShare } from '../services/exportService';
import { firestoreSync } from '../services/firestoreSync';

type WelcomeScreenProps = {
  setActiveScreen: (screen: Screen) => void;
  recipes: Recipe[];
  groceryList?: GroceryListItem[];
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ setActiveScreen, recipes, groceryList = [] }) => {
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; status: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
        await exportBackupJsonWithShare(recipes, groceryList);
        setIsModalOpen(false);
    } catch (error) {
        console.error("Backup failed:", error);
        alert("Une erreur est survenue lors de la sauvegarde.");
    } finally {
        setIsBackingUp(false);
    }
  };

  const handleExportWord = async () => {
    setIsExportingWord(true);
    try {
        await exportRecipesToWord(recipes);
        setIsModalOpen(false);
    } catch (error) {
        console.error("Export failed:", error);
        alert("Une erreur est survenue lors de l'exportation.");
    } finally {
        setIsExportingWord(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        setIsImporting(true);
        setIsModalOpen(false);
        setImportProgress({ current: 0, total: 100, status: 'Lecture du fichier...' });

        const text = await file.text();
        const data = JSON.parse(text);

        if (!data || !Array.isArray(data.recipes)) {
            throw new Error("Format de fichier invalide. Le fichier doit contenir une liste de recettes.");
        }

        const totalItems = data.recipes.length + (data.groceryList?.length || 0);
        setImportProgress({ current: 0, total: totalItems, status: `Démarrage de l'importation de ${data.recipes.length} recettes...` });

        const result = await firestoreSync.importBackup(data, (curr, tot, status) => {
            setImportProgress({ current: curr, total: tot, status });
        });

        alert(`✅ Importation terminée avec succès !\n${result.recipesImported} recettes et ${result.imagesImported} photos synchronisées dans Firestore.`);
    } catch (error: any) {
        console.error("Import failed:", error);
        alert(`❌ Erreur lors de l'importation : ${error.message || 'Fichier invalide'}`);
    } finally {
        setIsImporting(false);
        setImportProgress(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F9F9F5] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-xs">
        <img 
          src="https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=2940&auto=format&fit=crop" 
          alt="Mosaïque de plats délicieux" 
          className="w-full h-auto object-cover rounded-2xl shadow-lg"
        />
      </div>

      <h1 className="text-4xl font-bold text-gray-800 mt-4">Nos Recettes</h1>

      {/* Hidden file input for backup restoration */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />

      {/* Import in progress modal */}
      {isImporting && importProgress && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Importation en cours</h3>
                <p className="text-sm text-gray-600 mb-4">{importProgress.status}</p>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                        className="bg-blue-600 h-full transition-all duration-200" 
                        style={{ width: `${Math.round((importProgress.current / (importProgress.total || 1)) * 100)}%` }}
                    ></div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    {Math.round((importProgress.current / (importProgress.total || 1)) * 100)}% ({importProgress.current} / {importProgress.total})
                </p>
                <p className="text-xs text-amber-600 mt-3">Veuillez ne pas fermer cette fenêtre pendant le transfert.</p>
            </div>
        </div>
      )}

      {/* Single Export / Import Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-gray-800">Exporter / Importer</h3>
            <p className="text-xs text-gray-500">
              Vos recettes se synchronisent déjà automatiquement dans Firestore. Vous pouvez créer une copie de sécurité ou importer un fichier.
            </p>

            <div className="space-y-3 pt-2">
              {/* Option 1: Backup JSON */}
              <button
                onClick={handleBackup}
                disabled={isBackingUp}
                className="w-full bg-[#2563EB] text-white font-semibold py-3.5 px-4 rounded-2xl shadow hover:bg-[#1D4ED8] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {isBackingUp ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Préparation du fichier...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Sauvegarder tout (JSON)</span>
                  </>
                )}
              </button>

              {/* Option 2: Restore JSON */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-gray-100 text-gray-800 font-semibold py-3.5 px-4 rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Importer une sauvegarde (JSON)</span>
              </button>

              {/* Option 3: Export to Word */}
              <button
                onClick={handleExportWord}
                disabled={isExportingWord}
                className="w-full bg-[#EBF7D4] text-gray-800 font-semibold py-3.5 px-4 rounded-2xl hover:bg-[#D4F78F] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {isExportingWord ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-gray-800" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Génération Word...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Exporter vers Word (.docx)</span>
                  </>
                )}
              </button>
            </div>

            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Main Home Screen Actions */}
      <div className="w-full mt-6 space-y-4 max-w-xs">
        <ActionButton onClick={() => setActiveScreen('add')}>Ajouter une recette</ActionButton>
        <ActionButton onClick={() => setActiveScreen('recipes')}>Parcourir les recettes ({recipes.length})</ActionButton>
        <ActionButton onClick={() => setActiveScreen('search')}>Chercher une recette</ActionButton>
        <ActionButton onClick={() => setActiveScreen('list')}>Liste d'épicerie</ActionButton>
        
        {/* Single Consolidated Button for Export / Import / Backup */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-[#2563EB] text-white font-semibold py-4 px-6 rounded-2xl shadow-md hover:bg-[#1D4ED8] transition-all duration-200 transform hover:scale-105 text-lg flex justify-center items-center gap-2"
          title="Exporter ou importer des recettes en format JSON ou Word"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span>Exporter / Importer recettes</span>
        </button>
      </div>
    </div>
  );
};

const ActionButton: React.FC<{onClick: () => void, children: React.ReactNode}> = ({ onClick, children }) => (
    <button
        onClick={onClick}
        className="w-full bg-[#D4F78F] text-gray-800 font-semibold py-4 px-6 rounded-2xl shadow-sm hover:bg-[#BDEE63] transition-all duration-200 transform hover:scale-105 text-lg"
    >
        {children}
    </button>
);

export default WelcomeScreen;
