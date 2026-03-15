import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

const ReportEditor = ({ screeningId, initialReport, isClinician }) => {
    const [report, setReport] = useState(initialReport || '');
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);

    const handleSave = async () => {
        try {
            setSaving(true);

            // Create a history entry
            const historyEntry = {
                report: initialReport,
                timestamp: new Date().toISOString(),
                savedBy: 'Clinician' // In a real app, use user name/ID
            };

            // Fetch current history
            const { data: screening } = await supabase.from('screenings').select('report_history').eq('id', screeningId).single();
            const currentHistory = screening?.report_history || [];

            const { error } = await supabase
                .from('screenings')
                .update({
                    clinical_report: report,
                    report_history: [...currentHistory, historyEntry]
                })
                .eq('id', screeningId);

            if (error) throw error;
            setLastSaved(new Date());
        } catch (err) {
            console.error('Error saving report:', err);
            alert('Failed to save report');
        } finally {
            setSaving(false);
        }
    };

    if (!isClinician) {
        return (
            <div className="text-sm text-gray-800 dark:text-slate-200 bg-white/50 dark:bg-slate-900/50 p-4 rounded-xl border border-purple-100 dark:border-purple-900/30">
                {initialReport ? (
                    <p className="whitespace-pre-wrap">{initialReport}</p>
                ) : (
                    <p className="text-gray-500 dark:text-slate-500 italic">Pending clinical review.</p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <textarea
                className="w-full p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 focus:ring-2 focus:ring-purple-500 outline-none text-sm min-h-[120px] bg-white dark:bg-slate-950 text-gray-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                placeholder="Enter clinical findings, recommendations, and next steps..."
                value={report}
                onChange={(e) => setReport(e.target.value)}
            />
            <div className="flex justify-between items-center">
                <span className="text-xs text-purple-600">
                    {lastSaved ? `Saved at ${lastSaved.toLocaleTimeString()}` : ''}
                </span>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Report'}
                </button>
            </div>
        </div>
    );
};

export default ReportEditor;
