
import React, { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Share2, Printer, Activity, ShieldCheck, AlertTriangle, Brain, Stethoscope, Clock, FileText, ChevronDown, History, X } from 'lucide-react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceArea
} from 'recharts'
import Loading from '../components/ui/Loading'
import { useAuth } from '../context/useAuth'

const ReportEditor = ({ screeningId, initialReport, isClinician }) => {
    const [report, setReport] = useState(initialReport || '')
    const [saving, setSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState(null)

    const handleSave = async () => {
        try {
            setSaving(true)

            // Create a history entry
            const historyEntry = {
                report: initialReport,
                timestamp: new Date().toISOString(),
                savedBy: 'Clinician' // In a real app, use user name/ID
            };

            const updatedHistory = [...(initialReport ? [historyEntry] : [])];

            const { error } = await supabase
                .from('screenings')
                .update({
                    clinical_report: report,
                    // We append to history if there was previous content
                    report_history: supabase.rpc('append_jsonb_array', {
                        col: 'report_history',
                        val: historyEntry
                    }).error ? [] : undefined // Fallback if RPC fails, or just use normal update
                })
                .eq('id', screeningId)

            // Better approach for history without RPC:
            const { data: screening } = await supabase.from('screenings').select('report_history').eq('id', screeningId).single();
            const currentHistory = screening?.report_history || [];

            await supabase
                .from('screenings')
                .update({
                    clinical_report: report,
                    report_history: [...currentHistory, historyEntry]
                })
                .eq('id', screeningId)

            if (error) throw error
            setLastSaved(new Date())
        } catch (err) {
            console.error('Error saving report:', err)
            alert('Failed to save report')
        } finally {
            setSaving(false)
        }
    }

    if (!isClinician) {
        return (
            <div className="text-sm text-gray-800 dark:text-slate-200 bg-white/50 dark:bg-slate-900/50 p-4 rounded-xl border border-purple-100 dark:border-purple-900/30">
                {initialReport ? (
                    <p className="whitespace-pre-wrap">{initialReport}</p>
                ) : (
                    <p className="text-gray-500 dark:text-slate-500 italic">Pending clinical review.</p>
                )}
            </div>
        )
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
    )
}

export default function Results() {
    const { id } = useParams()
    const { userProfile } = useAuth()
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true)
    const [screening, setScreening] = useState(null)
    const [patient, setPatient] = useState(null)
    const [showReferral, setShowReferral] = useState(false)
    const [showHistory, setShowHistory] = useState(false)

    // Get params
    const reliabilityParam = searchParams.get('reliability');
    const durationParam = searchParams.get('duration');

    useEffect(() => {
        fetchScreening()
    }, [id])

    const fetchScreening = async () => {
        try {
            // Fetch screening and related patient
            const { data, error } = await supabase
                .from('screenings')
                .select(`
          *,
            patients (*)
        `)
                .eq('id', id)
                .single()

            if (error) throw error

            setScreening(data)
            setPatient(data.patients)
        } catch (error) {
            console.error('Error fetching results:', error)
        } finally {
            setLoading(false)
        }
    }

    // Parse reliability from notes if not in URL
    const getReliabilityScore = () => {
        if (reliabilityParam) return parseInt(reliabilityParam);
        if (screening?.notes && screening.notes.includes("Reliability Score:")) {
            const match = screening.notes.match(/Reliability Score: (\d+)%/);
            if (match) return parseInt(match[1]);
        }
        return null;
    }

    // Get Duration
    const getDuration = () => {
        if (durationParam) return decodeURIComponent(durationParam);
        if (screening?.notes && screening.notes.includes("Duration:")) {
            const match = screening.notes.match(/Duration: ([\w\s]+)/);
            if (match) return match[1];
        }
        return "N/A";
    }

    // Helper to format data for Recharts
    const getChartData = () => {
        if (!screening?.data) return []

        // Standard frequencies (250 - 8000 Hz)
        const freqs = [250, 500, 1000, 2000, 4000, 8000]

        // Recharts needs an array of objects for the X-axis
        return freqs.map(f => ({
            freq: f,
            left: screening.data.left?.[f] !== undefined ? screening.data.left[f] : null,
            right: screening.data.right?.[f] !== undefined ? screening.data.right[f] : null,
        }))
    }

    // Advanced Metrics Calculation
    const calculateMetrics = () => {
        if (!screening?.data) return { leftPTA: 0, rightPTA: 0, asymmetry: [], pattern: 'Unknown', clinicalSummary: '' };

        const left = screening.data.left || {};
        const right = screening.data.right || {};

        // 1. Pure Tone Average (PTA) - 500, 1000, 2000 Hz
        const calculatePTA = (earData) => {
            const freqs = [500, 1000, 2000];
            let sum = 0;
            let count = 0;
            freqs.forEach(f => {
                if (earData[f] !== undefined) {
                    sum += earData[f];
                    count++;
                }
            });
            return count > 0 ? Math.round(sum / count) : 0;
        };

        const leftPTA = calculatePTA(left);
        const rightPTA = calculatePTA(right);

        // 2. Asymmetry Detection (>15dB diff at 2 consecutive standard freqs)
        const standardFreqs = [250, 500, 1000, 2000, 4000, 8000];
        let asymmetryDetected = false;
        let asymmetryDetails = "";

        for (let i = 0; i < standardFreqs.length - 1; i++) {
            const f1 = standardFreqs[i];
            const f2 = standardFreqs[i + 1];

            if (left[f1] !== undefined && right[f1] !== undefined && left[f2] !== undefined && right[f2] !== undefined) {
                const diff1 = Math.abs(left[f1] - right[f1]);
                const diff2 = Math.abs(left[f2] - right[f2]);

                if (diff1 > 15 && diff2 > 15) {
                    asymmetryDetected = true;
                    asymmetryDetails = `Significant asymmetry (>15dB) detected at ${f1}Hz - ${f2}Hz.`;
                    break;
                }
            }
        }

        // 3. Pattern Detection (Based on Better Ear)
        let pattern = "Flat / Unspecified";
        const betterEar = leftPTA < rightPTA ? left : right;

        // Simple Slope Check (Low vs High)
        const low = (betterEar[250] || 0) + (betterEar[500] || 0);
        const high = (betterEar[4000] || 0) + (betterEar[8000] || 0);

        if (high > low + 30) pattern = "High-Frequency Sloping";
        else if (low > high + 20) pattern = "Low-Frequency Rising";
        else if (betterEar[4000] && betterEar[2000] && betterEar[8000] && betterEar[4000] > betterEar[2000] + 15 && betterEar[4000] > betterEar[8000] + 10) {
            pattern = "Notched (Possible Noise Induced)";
        } else if (Math.abs(high - low) < 20) {
            pattern = "Flat configuration";
        }

        // 4. Automated Clinical Summary
        const severity = (pta) => {
            if (pta < 20) return "normal hearing";
            if (pta <= 34) return "mild hearing loss";
            if (pta <= 49) return "moderate hearing loss";
            if (pta <= 64) return "moderately severe hearing loss";
            if (pta <= 79) return "severe hearing loss";
            if (pta <= 94) return "profound hearing loss";
            return "total hearing loss";
        }

        const betterPTA = Math.min(leftPTA, rightPTA);
        const worsePTA = Math.max(leftPTA, rightPTA);

        let summary = "";
        if (betterPTA < 20 && worsePTA < 20) {
            summary = "Bilateral normal hearing sensitivity within normal limits.";
        } else if (Math.abs(leftPTA - rightPTA) < 15) {
            summary = `Semmetrical bilateral ${severity(betterPTA)}. ${pattern} pattern.`;
        } else {
            summary = `Asymmetrical hearing. Left ear indicates ${severity(leftPTA)}, Right ear indicates ${severity(rightPTA)}. ${asymmetryDetails}`;
        }

        if (pattern.includes("Notched")) {
            summary += " Notched pattern at 4kHz suggests possible noise-induced hearing loss.";
        }

        if (asymmetryDetected) {
            summary += " ENT investigation recommended due to asymmetry.";
        }

        return { leftPTA, rightPTA, asymmetryDetected, asymmetryDetails, pattern, clinicalSummary: summary };
    }


    // Updated WHO 2026 Grading Logic (Better Ear Average)
    const getClassificationAndRecommendations = () => {
        if (!screening?.data) return { grade: "Unknown", recommendations: [] };

        const calculatePTA = (earData) => {
            if (!earData) return 999;
            const freqs = [500, 1000, 2000, 4000];
            let sum = 0;
            let count = 0;
            freqs.forEach(f => {
                if (earData[f] !== undefined) {
                    sum += earData[f];
                    count++;
                }
            });
            return count > 0 ? sum / count : 999; // Return high if no data
        };

        const leftPTA = calculatePTA(screening.data.left);
        const rightPTA = calculatePTA(screening.data.right);

        // Better ear = lower dB threshold
        const betterEarPTA = Math.min(leftPTA, rightPTA);

        if (betterEarPTA === 999) return { grade: "Incomplete Data", recommendations: ["Test was not completed."] };

        let grade = "";
        let recommendations = [];

        // Grade 0: < 20 dB - Normal hearing
        if (betterEarPTA < 20) {
            grade = "Grade 0: Normal Hearing";
            recommendations = [
                "No hearing impairment detected.",
                "Routine screening advised.",
                "Avoid excessive noise exposure."
            ];
        }
        // Grade 1: 20-34 dB - Mild hearing loss
        else if (betterEarPTA <= 34) {
            grade = "Grade 1: Mild Hearing Loss";
            recommendations = [
                "Counseling on communication strategies.",
                "Preferential seating (especially children).",
                "Monitor academic/work performance.",
                "Hearing aids may be considered if difficulty reported.",
                "Annual audiological follow-up recommended."
            ];
        }
        // Grade 2: 35-49 dB - Moderate hearing loss
        else if (betterEarPTA <= 49) {
            grade = "Grade 2: Moderate Hearing Loss";
            recommendations = [
                "Hearing aids usually recommended.",
                "Speech therapy may be beneficial.",
                "FM System or hearing assistive technology for classroom use.",
                "Teacher awareness and educational accommodations."
            ];
        }
        // Grade 3: 50-64 dB - Moderately severe
        else if (betterEarPTA <= 64) {
            grade = "Grade 3: Moderately Severe";
            recommendations = [
                "Hearing aids strongly recommended.",
                "Speech and language therapy required.",
                "Specialized educational support needed.",
                "Consider cochlear implant evaluation in some cases.",
                "Regular audiological follow-up essential."
            ];
        }
        // Grade 4: 65-79 dB - Severe
        else if (betterEarPTA <= 79) {
            grade = "Grade 4: Severe Hearing Loss";
            recommendations = [
                "Powerful hearing aids or cochlear implants needed.",
                "Intensive speech and language therapy.",
                "Lip-reading instructions/training.",
                "Specialized educational support with sign language.",
                "Audiological and educational rehabilitation program."
            ];
        }
        // Grade 5: 80-94 dB - Profound
        else if (betterEarPTA <= 94) {
            grade = "Grade 5: Profound Hearing Loss";
            recommendations = [
                "Cochlear implants strongly recommended.",
                "Sign language and comprehensive communication training.",
                "Intensive speech and auditory training.",
                "Specialized educational program for deaf students.",
                "Multidisciplinary rehabilitation approach."
            ];
        }
        // Grade 6: >= 95 dB - Complete
        else {
            grade = "Grade 6: Complete Hearing Loss";
            recommendations = [
                "Cochlear implant evaluation essential.",
                "Sign language as primary communication mode.",
                "Comprehensive deaf education program.",
                "Assistive listening devices and visual alert systems.",
                "Family counseling and support services.",
                "Community resources for deaf individuals."
            ];
        }

        return { grade, recommendations };
    }

    if (loading) return <div className="h-screen flex items-center justify-center"><Loading /></div>
    if (!screening) return <div className="p-8 text-center text-red-500">Result not found. ID: {id}</div>

    const chartData = getChartData()
    const { grade, recommendations } = getClassificationAndRecommendations();
    const reliabilityScore = getReliabilityScore();
    const duration = getDuration();
    const { leftPTA, rightPTA, asymmetryDetected, pattern, clinicalSummary } = calculateMetrics();

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4 sm:px-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4 w-full md:w-auto">
                    <Link to="/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors flex-shrink-0">
                        <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                    </Link>
                    <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-full border-2 border-blue-500/10 overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 font-bold text-blue-600 dark:text-blue-400 uppercase">
                            {patient?.avatar_url ? (
                                <img src={patient.avatar_url} alt={patient.name} className="w-full h-full object-cover" />
                            ) : (
                                <span>{patient?.name?.[0]}</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">Clinical Audiogram</h1>
                            <p className="text-sm sm:text-base text-gray-500 dark:text-slate-400 truncate">Patient: <span className="font-semibold text-gray-900 dark:text-slate-200">{patient?.name}</span></p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <button onClick={() => window.print()} className="p-2 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Print Audiogram">
                        <Printer className="w-5 h-5" />
                    </button>
                    <button onClick={() => setShowReferral(true)} className="p-2 text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors" title="Generate ENT Referral">
                        <FileText className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                        <Share2 className="w-5 h-5" />
                    </button>
                    <span className={`px-3 py-1 sm:px-4 sm:py-2 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap ${grade.includes('Grade 0') ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                        grade.includes('Grade 1') ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                            grade.includes('Grade 2') ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' :
                                grade.includes('Grade 3') ? 'bg-orange-200 dark:bg-orange-900/50 text-orange-900 dark:text-orange-200' :
                                    grade.includes('Grade 4') ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                        grade.includes('Grade 5') ? 'bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-200' :
                                            'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200'
                        }`}>
                        {grade.toUpperCase()}
                    </span>
                </div>
            </div>

            {/* Metrics Bar - Auto-stacking on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center sm:items-start text-center sm:text-left transition-all hover:shadow-md dark:hover:bg-slate-800/50">
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-1">Right Ear PTA</span>
                    <span className="text-2xl font-black text-red-500 dark:text-red-400">{rightPTA} dB HL</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center sm:items-start text-center sm:text-left transition-all hover:shadow-md dark:hover:bg-slate-800/50">
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-1">Left Ear PTA</span>
                    <span className="text-2xl font-black text-blue-500 dark:text-blue-400">{leftPTA} dB HL</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center sm:items-start text-center sm:text-left transition-all hover:shadow-md dark:hover:bg-slate-800/50">
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-1">Duration</span>
                    <span className="text-2xl font-black text-gray-800 dark:text-slate-200">{duration}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center sm:items-start text-center sm:text-left transition-all hover:shadow-md dark:hover:bg-slate-800/50">
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-1">Pattern</span>
                    <span className="text-lg font-black text-gray-800 dark:text-slate-200 break-words line-clamp-1" title={pattern}>{pattern}</span>
                </div>
            </div>

            {/* Asymmetry Alert (Novelty #2) */}
            {asymmetryDetected && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4 flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm">Asymmetrical Hearing Detected</h3>
                        <p className="text-xs text-amber-800 dark:text-amber-400 mt-1">Significant difference between ears ({'>'}15dB). ⚠ ENT Referral Recommended to rule out retrocochlear pathology.</p>
                    </div>
                </div>
            )}

            {/* Reliability Score Banner */}
            {reliabilityScore !== null && (
                <div className={`rounded-xl p-4 flex items-center justify-between ${reliabilityScore >= 85 ? 'bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-900/30' :
                    reliabilityScore >= 70 ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30' :
                        'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30'
                    }`}>
                    <div className="flex items-center space-x-3">
                        {reliabilityScore >= 85 ? <ShieldCheck className="w-6 h-6 text-teal-600 dark:text-teal-400" /> : <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
                        <div>
                            <h3 className={`font-bold ${reliabilityScore >= 85 ? 'text-teal-900 dark:text-teal-200' : 'text-amber-900 dark:text-amber-200'}`}>Test Reliability: {reliabilityScore}% ({
                                reliabilityScore >= 90 ? 'Excellent' :
                                    reliabilityScore >= 80 ? 'Good' :
                                        reliabilityScore >= 70 ? 'Fair' : 'Poor'
                            })</h3>
                            <p className={`text-xs ${reliabilityScore >= 85 ? 'text-teal-700 dark:text-teal-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                Based on response consistency and false positive checks.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Automated Clinical Interpretation (Novelty #6 - Most Impressive) */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-950 p-6 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center space-x-2 mb-3">
                        {/* <Brain className="w-5 h-5 text-indigo-600" />*/}
                        <h4 className="font-bold text-indigo-900 dark:text-indigo-400">Automated Clinical Interpretation</h4>
                    </div>
                    <p className="text-indigo-800 dark:text-indigo-200 leading-relaxed font-medium">
                        "{clinicalSummary}"
                    </p>
                    {/*<div className="flex items-center space-x-2 mt-4 text-xs text-indigo-500 lowercase">
                        <Stethoscope className="w-3 h-3" />
                    </div>*/}
                </div>
                {/*<div className="absolute top-0 right-0 p-4 opacity-10">
                    <Activity className="w-24 h-24 text-indigo-900" />
                </div>*/}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                {/* Main Chart - Take full width and centered on mobile */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 order-1">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                <Activity size={18} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Pure Tone Audiometry</h3>
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono hidden sm:inline">(LOG SCALE)</span>
                        </div>
                        <div className="flex items-center gap-6 text-xs font-bold text-gray-900 dark:text-white">
                            <div className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded-full mr-2 shadow-sm shadow-red-100 dark:shadow-none"></span>Right <span className="hidden sm:inline ml-1">(O)</span></div>
                            <div className="flex items-center"><span className="w-3 h-3 bg-blue-500 rounded-full mr-2 shadow-sm shadow-blue-100 dark:shadow-none"></span>Left <span className="hidden sm:inline ml-1">(X)</span></div>
                        </div>
                    </div>

                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="freq"
                                    type="number"
                                    scale="log"
                                    domain={[250, 8000]}
                                    ticks={[250, 500, 1000, 2000, 4000, 8000]}
                                    allowDataOverflow={true}
                                    tick={{ fontSize: 12 }}
                                    label={{ value: 'Frequency (Hz)', position: 'bottom', offset: 0 }}
                                />
                                <YAxis
                                    reversed={true}
                                    domain={[-10, 120]}
                                    ticks={[-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]}
                                    label={{ value: 'Hearing Level (dB HL)', angle: -90, position: 'insideLeft' }}
                                />
                                <Tooltip
                                    labelFormatter={(v) => `${v} Hz`}
                                    formatter={(value, name) => [`${value} dB`, name === 'left' ? 'Left Ear' : 'Right Ear']}
                                />

                                {/* Shaded Normal Zone - WHO 2026: < 20 dB */}
                                <ReferenceArea y1={-10} y2={20} fill="green" fillOpacity={0.05} label={{ value: 'Normal', position: 'insideTopLeft', fontSize: 10, fill: 'green', opacity: 0.5 }} />

                                {/* Social Communication Zone (20-40 dB) */}
                                <ReferenceArea y1={20} y2={40} fill="#fef3c7" fillOpacity={0.05} label={{ value: 'Mild/Conversational', position: 'insideTopLeft', fontSize: 10, fill: '#b45309', opacity: 0.5 }} />

                                {/* Speech Banana Approximation Area (Optional - but very clinical) */}
                                <ReferenceArea x1={500} x2={4000} y1={15} y2={60} fillOpacity={0} stroke="#cbd5e1" strokeDasharray="3 3" />

                                {/* Right Ear (Red Circle 'O') */}
                                <Line
                                    type="linear"
                                    dataKey="right"
                                    stroke="#ef4444"
                                    strokeWidth={3}
                                    dot={{ r: 8, stroke: '#ef4444', strokeWidth: 2, fill: 'white' }}
                                    activeDot={{ r: 10 }}
                                    connectNulls
                                />
                                {/* Left Ear (Blue Cross 'X') */}
                                <Line
                                    type="linear"
                                    dataKey="left"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    strokeDasharray="5 5"
                                    dot={<CustomCrossDot />}
                                    activeDot={{ r: 10 }}
                                    connectNulls
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sidebar Info - Stacked below chart on mobile */}
                <div className="space-y-6 order-2">
                    {/* Clinical Report Section */}
                    <div className="bg-purple-50 dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-purple-100 dark:border-purple-900/30">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-purple-900 dark:text-purple-400">Clinical Report</h4>
                            {screening.clinical_report && (
                                <span className="bg-purple-200 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 text-xs px-2 py-1 rounded-md font-medium">
                                    Submitted
                                </span>
                            )}
                        </div>

                        <ReportEditor
                            screeningId={screening.id}
                            initialReport={screening.clinical_report}
                            reportHistory={screening.report_history}
                            isClinician={userProfile?.role === 'clinician' || userProfile?.role === 'audiologist'}
                        />
                    </div>

                    {/* Recommendations */}
                    <div className="bg-blue-50 dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-900/30">
                        <h4 className="font-bold text-blue-900 dark:text-blue-400 mb-2">Clinical Recommendations</h4>
                        <p className="text-xs text-blue-600 dark:text-blue-500 mb-4 uppercase tracking-wider font-semibold">Based on <span style={{ color: 'red', fontWeight: 'bold' }}>(WHO 2026)</span> Grades</p>

                        <ul className="space-y-3">
                            {recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start text-blue-800 dark:text-blue-300 text-sm">
                                    <span className="mr-2 text-xl leading-none dark:text-blue-500">&bull;</span>
                                    <span>{rec}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-900/40">
                            <p className="text-xs text-blue-500 dark:text-blue-600 italic">
                                "Early amplification may improve speech understanding."
                            </p>
                        </div>
                    </div>

                    {/* Screening Notes (Technician/Teacher notes) */}
                    <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-2">Screening Notes</h4>
                        <p className="text-sm text-gray-600 dark:text-slate-400 italic">
                            {screening.notes || "No notes added during screening."}
                        </p>
                    </div>
                </div>
            </div>
            {showReferral && (
                <ReferralLetter
                    screening={screening}
                    patient={patient}
                    grade={grade}
                    onClose={() => setShowReferral(false)}
                />
            )}
        </div>
    )
}

const CustomCrossDot = (props) => {
    const { cx, cy, stroke } = props;
    const size = 6;
    return (
        <svg x={cx - size} y={cy - size} width={size * 2} height={size * 2} viewBox="0 0 12 12">
            <line x1="1" y1="1" x2="11" y2="11" stroke={stroke} strokeWidth="3" />
            <line x1="1" y1="11" x2="11" y2="1" stroke={stroke} strokeWidth="3" />
        </svg>
    );
};

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
