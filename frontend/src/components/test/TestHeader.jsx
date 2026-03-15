import React from 'react';
import { X, MicOff, Mic } from 'lucide-react';

export default function TestHeader({
    patientName,
    patientPhoto,
    currentStep,
    noiseLevel,
    isNoisy,
    onCancel,
    onEarChange,
    onMaskingChange
}) {
    return (
        <div className="flex justify-between items-center mb-10">
            <button onClick={onCancel} className="p-2 text-[#90A4AE] hover:text-[#607D8B] dark:hover:text-slate-300 transition-colors">
                <X className="w-6 h-6" />
            </button>

            <div className="flex flex-col items-center">
                <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 rounded-full border border-blue-500/10 overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-sm font-bold text-blue-600 dark:text-blue-400 uppercase text-xs">
                        {patientPhoto ? (
                            <img src={patientPhoto} alt={patientName} className="w-full h-full object-cover" />
                        ) : (
                            <span>{patientName?.charAt(0) || '?'}</span>
                        )}
                    </div>
                    <span className="text-[10px] font-bold text-[#B0BEC5] dark:text-slate-500 uppercase tracking-[0.2em]">Testing Phase</span>
                </div>

                {/* Ear Selection Buttons */}
                <div className="flex items-center space-x-1 mb-2 bg-gray-100 dark:bg-slate-900 p-1 rounded-full border border-transparent dark:border-slate-700">
                    <button
                        onClick={() => onEarChange('right')}
                        className={`text-xs font-medium px-4 py-1.5 rounded-full uppercase tracking-wide transition-all ${currentStep.ear === 'right'
                            ? 'bg-red-500 text-white shadow-md'
                            : 'bg-transparent text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Right Ear
                    </button>
                    <button
                        onClick={() => onEarChange('left')}
                        className={`text-xs font-medium px-4 py-1.5 rounded-full uppercase tracking-wide transition-all ${currentStep.ear === 'left'
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-transparent text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Left Ear
                    </button>
                </div>

                {/* Masking Mode Buttons */}
                <div className="flex items-center space-x-1 bg-gray-100 dark:bg-slate-900 p-1 rounded-full border border-transparent dark:border-slate-700">
                    <button
                        onClick={() => onMaskingChange('unmasked')}
                        className={`text-xs font-medium px-4 py-1.5 rounded-full uppercase tracking-wide transition-all ${currentStep.masking === 'unmasked'
                            ? 'bg-[#607D8B] dark:bg-slate-600 text-white shadow-md'
                            : 'bg-transparent text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Unmasked
                    </button>
                    <button
                        onClick={() => onMaskingChange('masked')}
                        className={`text-xs font-medium px-4 py-1.5 rounded-full uppercase tracking-wide transition-all ${currentStep.masking === 'masked'
                            ? 'bg-[#607D8B] dark:bg-slate-600 text-white shadow-md'
                            : 'bg-transparent text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Masked
                    </button>
                </div>
            </div>

            {/* Empty div to balance flex-between */}
            <div className="w-10"></div>
        </div>
    );
}
