import React from 'react';

export default function TestProgress({
    frequencies,
    currentFreqIndex,
    db
}) {
    return (
        <div className="mb-10 text-center">
            <div className="text-7xl font-light text-[#607D8B] dark:text-slate-200 tracking-tighter mb-8">
                {frequencies[currentFreqIndex]}<span className="text-2xl font-light text-[#B0BEC5] dark:text-slate-500 ml-1">Hz</span>
            </div>
            
            <div className="flex justify-center space-x-1.5">
                {frequencies.map((f, i) => (
                    <div
                        key={f}
                        className={`h-1.5 w-8 rounded-full transition-all duration-300 ${i === currentFreqIndex ? 'bg-[#607D8B] dark:bg-slate-400 w-12' : i < currentFreqIndex ? 'bg-[#90A4AE] dark:bg-slate-600' : 'bg-[#CFD8DC] dark:bg-slate-800'}`}
                    />
                ))}
            </div>
        </div>
    );
}
