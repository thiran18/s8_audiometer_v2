import React from 'react';
import { X, Printer } from 'lucide-react';

const ReferralLetter = ({ screening, patient, grade, onClose }) => {
    const date = new Date().toLocaleDateString();

    // Dynamic Clinical Priority
    const getPriority = (gradeStr) => {
        if (!gradeStr) return { label: "Routine Review", color: "text-slate-500" };
        if (gradeStr.includes("Grade 0")) return { label: "Routine Monitoring", color: "text-green-500" };
        if (gradeStr.includes("Grade 1") || gradeStr.includes("Grade 2")) return { label: "Follow-up Advised", color: "text-amber-500" };
        return { label: "Urgent Review Advised", color: "text-red-500" };
    };

    const priority = getPriority(grade);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:hidden">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full p-8 space-y-6 overflow-y-auto max-h-[90vh] border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-6">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Referral Recommendation</h2>
                        <p className="text-sm text-slate-500 font-mono mt-1">Ref ID: {screening.id.slice(0, 8)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="space-y-4 text-gray-800 dark:text-slate-300">
                    <div className="flex justify-between text-sm">
                        <span><strong>Date:</strong> {date}</span>
                        <span><strong>Patient:</strong> {patient?.name}</span>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-sm leading-relaxed italic">
                            "To the ENT Specialist/Audiologist, <br /><br />
                            This patient was screened using the HearPulse digital audiometry platform.
                            Results indicate <strong>{grade || 'a hearing deficit'}</strong>
                            with a Pure Tone Average (PTA) in the better ear.
                            Further clinical investigation is recommended to determine the etiology and appropriate intervention."
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-1">Observation</h4>
                            <p className="text-sm font-semibold">{grade}</p>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-1">Clinical Priority</h4>
                            <p className={`text-sm font-semibold ${priority.color}`}>{priority.label}</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <button
                        onClick={() => window.print()}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center space-x-2"
                    >
                        <Printer className="w-5 h-5" />
                        <span>Print Official Copy</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReferralLetter;
