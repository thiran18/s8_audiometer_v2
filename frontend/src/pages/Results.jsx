
import React, { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Share2, Printer, Activity, ShieldCheck, AlertTriangle, Brain, Stethoscope, Clock } from 'lucide-react'
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
            const { error } = await supabase
                .from('screenings')
                .update({
                    clinical_report: report,
                    // reviewed_by: user.id // We need user context here if enforcing RLS strictly with user ID
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
            <div className="text-sm text-gray-800 bg-white/50 p-4 rounded-xl border border-purple-100">
                {initialReport ? (
                    <p className="whitespace-pre-wrap">{initialReport}</p>
                ) : (
                    <p className="text-gray-500 italic">Pending clinical review.</p>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <textarea
                className="w-full p-4 rounded-xl border border-purple-200 focus:ring-2 focus:ring-purple-500 outline-none text-sm min-h-[120px] bg-white"
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
                    <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Clinical Audiogram</h1>
                        <p className="text-sm sm:text-base text-gray-500 truncate">Patient: <span className="font-semibold text-gray-900">{patient?.name}</span></p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <button onClick={() => window.print()} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Printer className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Share2 className="w-5 h-5" />
                    </button>
                    <span className={`px-3 py-1 sm:px-4 sm:py-2 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap ${grade.includes('Grade 0') ? 'bg-green-100 text-green-800' :
                        grade.includes('Grade 1') ? 'bg-yellow-100 text-yellow-800' :
                            grade.includes('Grade 2') ? 'bg-orange-100 text-orange-800' :
                                grade.includes('Grade 3') ? 'bg-orange-200 text-orange-900' :
                                    grade.includes('Grade 4') ? 'bg-red-100 text-red-800' :
                                        grade.includes('Grade 5') ? 'bg-red-200 text-red-900' :
                                            'bg-gray-100 text-gray-800'
                        }`}>
                        {grade.toUpperCase()}
                    </span>
                </div>
            </div>

            {/* Metrics Bar - Auto-stacking on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center sm:items-start text-center sm:text-left transition-all hover:shadow-md">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Right Ear PTA</span>
                    <span className="text-2xl font-black text-red-500">{rightPTA} dB HL</span>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center sm:items-start text-center sm:text-left transition-all hover:shadow-md">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Left Ear PTA</span>
                    <span className="text-2xl font-black text-blue-500">{leftPTA} dB HL</span>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center sm:items-start text-center sm:text-left transition-all hover:shadow-md">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Duration</span>
                    <span className="text-2xl font-black text-gray-800">{duration}</span>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center sm:items-start text-center sm:text-left transition-all hover:shadow-md">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Pattern</span>
                    <span className="text-lg font-black text-gray-800 break-words line-clamp-1" title={pattern}>{pattern}</span>
                </div>
            </div>

            {/* Asymmetry Alert (Novelty #2) */}
            {asymmetryDetected && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-amber-900 text-sm">Asymmetrical Hearing Detected</h3>
                        <p className="text-xs text-amber-800 mt-1">Significant difference between ears ({'>'}15dB). ⚠ ENT Referral Recommended to rule out retrocochlear pathology.</p>
                    </div>
                </div>
            )}

            {/* Reliability Score Banner */}
            {reliabilityScore !== null && (
                <div className={`rounded-xl p-4 flex items-center justify-between ${reliabilityScore >= 85 ? 'bg-teal-50 border border-teal-100' :
                    reliabilityScore >= 70 ? 'bg-amber-50 border border-amber-100' :
                        'bg-red-50 border border-red-100'
                    }`}>
                    <div className="flex items-center space-x-3">
                        {reliabilityScore >= 85 ? <ShieldCheck className="w-6 h-6 text-teal-600" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                        <div>
                            <h3 className={`font-bold ${reliabilityScore >= 85 ? 'text-teal-900' : 'text-amber-900'}`}>Test Reliability: {reliabilityScore}% ({
                                reliabilityScore >= 90 ? 'Excellent' :
                                    reliabilityScore >= 80 ? 'Good' :
                                        reliabilityScore >= 70 ? 'Fair' : 'Poor'
                            })</h3>
                            <p className={`text-xs ${reliabilityScore >= 85 ? 'text-teal-700' : 'text-amber-700'}`}>
                                Based on response consistency and false positive checks.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Automated Clinical Interpretation (Novelty #6 - Most Impressive) */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center space-x-2 mb-3">
                        {/* <Brain className="w-5 h-5 text-indigo-600" />*/}
                        <h4 className="font-bold text-indigo-900">Automated Clinical Interpretation</h4>
                    </div>
                    <p className="text-indigo-800 leading-relaxed font-medium">
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
                <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 order-1">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Activity size={18} className="text-blue-600" />
                            </div>
                            <h3 className="font-bold text-gray-900">Pure Tone Audiometry</h3>
                            <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">(LOG SCALE)</span>
                        </div>
                        <div className="flex items-center gap-6 text-xs font-bold">
                            <div className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded-full mr-2 shadow-sm shadow-red-100"></span>Right <span className="hidden sm:inline ml-1">(O)</span></div>
                            <div className="flex items-center"><span className="w-3 h-3 bg-blue-500 rounded-full mr-2 shadow-sm shadow-blue-100"></span>Left <span className="hidden sm:inline ml-1">(X)</span></div>
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
                                <ReferenceArea y1={-10} y2={20} fill="green" fillOpacity={0.05} />

                                {/* Right Ear (Red Circle) */}
                                <Line
                                    type="linear"
                                    dataKey="right"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    dot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: 'white' }}
                                    activeDot={{ r: 8 }}
                                    connectNulls
                                />
                                {/* Left Ear (Blue Cross - using generic shape for now) */}
                                <Line
                                    type="linear"
                                    dataKey="left"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: 'white', shape: "cross" }}
                                    activeDot={{ r: 8 }}
                                    connectNulls
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sidebar Info - Stacked below chart on mobile */}
                <div className="space-y-6 order-2">
                    {/* Clinical Report Section */}
                    <div className="bg-purple-50 p-4 sm:p-6 rounded-2xl shadow-sm border border-purple-100">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-purple-900">Clinical Report</h4>
                            {screening.clinical_report && (
                                <span className="bg-purple-200 text-purple-800 text-xs px-2 py-1 rounded-md font-medium">
                                    Submitted
                                </span>
                            )}
                        </div>

                        <ReportEditor
                            screeningId={screening.id}
                            initialReport={screening.clinical_report}
                            isClinician={userProfile?.role === 'clinician' || userProfile?.role === 'audiologist'}
                        />
                    </div>

                    {/* Recommendations */}
                    <div className="bg-blue-50 p-4 sm:p-6 rounded-2xl shadow-sm border border-blue-100">
                        <h4 className="font-bold text-blue-900 mb-2">Clinical Recommendations</h4>
                        <p className="text-xs text-blue-600 mb-4 uppercase tracking-wider font-semibold">Based on <span style={{ color: 'red', fontWeight: 'bold' }}>(WHO 2026)</span> Grades</p>

                        <ul className="space-y-3">
                            {recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start text-blue-800 text-sm">
                                    <span className="mr-2 text-xl leading-none">&bull;</span>
                                    <span>{rec}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-6 pt-4 border-t border-blue-200">
                            <p className="text-xs text-blue-500 italic">
                                "Early amplification may improve speech understanding."
                            </p>
                        </div>
                    </div>

                    {/* Screening Notes (Technician/Teacher notes) */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-2">Screening Notes</h4>
                        <p className="text-sm text-gray-600 italic">
                            {screening.notes || "No notes added during screening."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
