import React, { useState } from 'react';

type TimerScreenProps = {
    onBack: () => void;
    timeLeft: number;
    isPaused: boolean;
    isActive: boolean;
    onStart: (duration: number) => void;
    onPauseResume: () => void;
    onReset: () => void;
};

const TimeInput: React.FC<{
    value: number;
    onValueChange: (value: string) => void;
    max: number;
    ariaLabel: string;
}> = ({ value, onValueChange, max, ariaLabel }) => {
    
    const increment = () => {
        let newValue = (value || 0) + 1;
        if (max !== 99 && newValue > max) newValue = 0; // wrap for min/sec
        else if (max === 99 && newValue > 99) newValue = 99; // clamp for hours
        onValueChange(String(newValue));
    };

    const decrement = () => {
        let newValue = (value || 0) - 1;
        if (max !== 99 && newValue < 0) newValue = max; // wrap for min/sec
        else if (max === 99 && newValue < 0) newValue = 0; // clamp for hours
        onValueChange(String(newValue));
    };

    return (
        <div className="flex items-center gap-2">
            <input 
                type="number"
                aria-label={ariaLabel}
                value={value} 
                onChange={(e) => onValueChange(e.target.value)} 
                className="w-16 bg-transparent text-center focus:outline-none appearance-none" 
            />
            <div className="bg-white rounded-lg shadow-sm flex flex-col overflow-hidden">
                <button onClick={increment} className="text-gray-700 hover:text-gray-700 bg-white hover:bg-white p-1" aria-label={`Augmenter ${ariaLabel}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                </button>
                <button onClick={decrement} className="text-gray-700 hover:text-gray-700 bg-white hover:bg-white p-1 border-t border-gray-200" aria-label={`Diminuer ${ariaLabel}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                </button>
            </div>
        </div>
    );
};


const TimerScreen: React.FC<TimerScreenProps> = ({ onBack, timeLeft, isPaused, isActive, onStart, onPauseResume, onReset }) => {
    const [initialTime, setInitialTime] = useState({ hours: 0, minutes: 10, seconds: 0 });

    const handleStart = () => {
        const totalSeconds = initialTime.hours * 3600 + initialTime.minutes * 60 + initialTime.seconds;
        if (totalSeconds > 0) {
            onStart(totalSeconds);
        }
    };
    
    const handleTimeChange = (unit: 'hours' | 'minutes' | 'seconds', value: string) => {
        let numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 0) {
            numValue = 0;
        }
        
        const max = unit === 'hours' ? 99 : 59;
        setInitialTime(prev => ({ ...prev, [unit]: Math.min(max, numValue) }));
    };

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    const totalInitialSeconds = initialTime.hours * 3600 + initialTime.minutes * 60 + initialTime.seconds;

    return (
        <div className="p-4 bg-[#F9F9F5] min-h-screen pb-24">
            <div className="flex items-center mb-6 relative h-10">
                <button onClick={onBack} className="p-2 absolute left-0" aria-label="Retour">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-3xl font-bold text-gray-800 text-center w-full">Minuteur</h1>
            </div>
            
            <div className="flex flex-col items-center justify-center pt-8">
                <div className="bg-[#f4f3f6] rounded-3xl shadow-lg p-8 w-full max-w-sm mx-auto">
                    {isActive ? (
                        <div className="text-6xl font-mono font-bold text-gray-800 text-center">
                            {formatTime(timeLeft)}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center space-x-2 text-5xl font-mono font-bold text-gray-800">
                           <TimeInput 
                                value={initialTime.hours} 
                                onValueChange={(v) => handleTimeChange('hours', v)}
                                max={99}
                                ariaLabel="Heures"
                            />
                            <span>:</span>
                            <TimeInput 
                                value={initialTime.minutes} 
                                onValueChange={(v) => handleTimeChange('minutes', v)}
                                max={59}
                                ariaLabel="Minutes"
                            />
                            <span>:</span>
                            <TimeInput 
                                value={initialTime.seconds} 
                                onValueChange={(v) => handleTimeChange('seconds', v)}
                                max={59}
                                ariaLabel="Secondes"
                            />
                        </div>
                    )}
                </div>
                
                <div className="w-full max-w-sm mx-auto mt-16 space-y-4">
                    {!isActive ? (
                         <button onClick={handleStart} disabled={totalInitialSeconds === 0} className="w-full bg-[#D4F78F] text-gray-800 font-bold text-xl py-4 rounded-2xl shadow-md hover:bg-[#BDEE63] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            Démarrer
                        </button>
                    ) : (
                        <>
                            <button onClick={onPauseResume} className="w-full bg-gray-200 text-gray-800 font-bold text-xl py-4 rounded-2xl shadow-md hover:bg-gray-300 transition-colors">
                                {isPaused ? 'Reprendre' : 'Pause'}
                            </button>
                            <button onClick={onReset} className="w-full bg-white text-gray-800 font-bold text-xl py-4 rounded-2xl shadow-md hover:bg-gray-100 transition-colors">
                                Annuler
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TimerScreen;
