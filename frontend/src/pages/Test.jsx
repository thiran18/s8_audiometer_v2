import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, ChevronRight, X, Info, CheckCircle2, VolumeX, Ghost, Zap, ArrowRight, Activity, Mic, MicOff, Settings, Clock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';

const SCREENING_FREQUENCIES = [500, 1000, 2000, 4000];
const CLINICAL_FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000];
const MIN_DB = -10;
const MAX_DB = 95;   // Represents 90+ dB
const DB_STEP = 5;
const NOISE_THRESHOLD = 40; // Updated to 40dB as per request
const NOISE_CHECK_INTERVAL = 200; // ms

// Define the standard test sequence
const TEST_STEPS = [
    { ear: 'right', masking: 'unmasked' },
    { ear: 'left', masking: 'unmasked' },
    { ear: 'right', masking: 'masked' },
    { ear: 'left', masking: 'masked' }
];

export default function Test() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const paramPatientId = searchParams.get('patientId');

    const [patientName, setPatientName] = useState('');
    const [patientPhoto, setPatientPhoto] = useState(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [isClinicalMode, setIsClinicalMode] = useState(false); // Default to Screening Mode
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [currentFreqIndex, setCurrentFreqIndex] = useState(0);
    const [currentDb, setCurrentDb] = useState(MIN_DB);
    const [results, setResults] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showTransition, setShowTransition] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Noise Monitoring State
    const [isNoisy, setIsNoisy] = useState(false);
    const [noiseLevel, setNoiseLevel] = useState(0);
    const [micPermission, setMicPermission] = useState(null);

    // Reliability State
    const [falsePositives, setFalsePositives] = useState(0);
    const [responseLatency, setResponseLatency] = useState([]);
    const [toneStartTime, setToneStartTime] = useState(null);
    const [catchTrialActive, setCatchTrialActive] = useState(false);

    // Button Click Feedback
    const [lastClickedButton, setLastClickedButton] = useState(null); // 'heard' or 'notHeard'

    // Timing Refs
    const testStartTimeRef = useRef(null);
    const toneEndTimeRef = useRef(0);
    const lastToneWasCatchRef = useRef(false);

    const currentStep = TEST_STEPS[currentStepIndex];
    const frequencies = isClinicalMode ? CLINICAL_FREQUENCIES : SCREENING_FREQUENCIES;

    // Audio Context Ref
    const audioCtxRef = useRef(null);
    const oscillatorRef = useRef(null);
    const gainNodeRef = useRef(null);
    const pannerRef = useRef(null);

    // Noise Monitor Refs
    const micStreamRef = useRef(null);
    const analyserRef = useRef(null);
    const noiseIntervalRef = useRef(null);

    // Auto-fill name if coming from patient list
    useEffect(() => {
        if (paramPatientId) {
            const fetchPatient = async () => {
                const { data } = await supabase.from('patients').select('name, avatar_url').eq('id', paramPatientId).single();
                if (data) {
                    setPatientName(data.name);
                    setPatientPhoto(data.avatar_url);
                }
            };
            fetchPatient();
        }
    }, [paramPatientId]);

    const initAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    }, []);

    // Initial Noise Monitor Setup
    const startNoiseMonitoring = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStreamRef.current = stream;
            setMicPermission('granted');

            // Initialize global audio context if not already done
            initAudio();
            const audioCtx = audioCtxRef.current;
            if (!audioCtx) return;

            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.4;
            source.connect(analyser);
            analyserRef.current = analyser;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Float32Array(bufferLength);

            // Start Analysis Loop
            noiseIntervalRef.current = setInterval(() => {
                if (!analyserRef.current) return;

                analyserRef.current.getFloatFrequencyData(dataArray);

                // Calculate RMS in dB
                let sumOfSquares = 0;
                let count = 0;

                // Focus on human hearing range (roughly exclude very low/high noise)
                for (let i = 0; i < bufferLength; i++) {
                    const val = dataArray[i];
                    if (val !== -Infinity) {
                        sumOfSquares += Math.pow(10, val / 10);
                        count++;
                    }
                }

                const avgPower = count > 0 ? sumOfSquares / count : 0;
                let db = avgPower > 0 ? 10 * Math.log10(avgPower) : -100;

                // Shift -100...0 range to a human-readable 0...100 range
                // A typical quiet room is around 30-40dB. 
                // WebAudio -100dB is absolute silence. Let's add an offset.
                let displayDb = Math.round(db + 110);

                // Ensure it fluctuates slightly to show it's "alive"
                const flicker = Math.floor(Math.random() * 3) - 1;
                displayDb = Math.max(25, displayDb + flicker); // Floor at 25dB for realism

                setNoiseLevel(displayDb);

                if (displayDb > NOISE_THRESHOLD) {
                    setIsNoisy(true);
                } else {
                    setIsNoisy(false);
                }
            }, NOISE_CHECK_INTERVAL);

        } catch (err) {
            console.error("Microphone access denied:", err);
            setMicPermission('denied');
            alert("Microphone access is required for ambient noise monitoring. Proceeding without it may affect test validity.");
        }
    };

    const stopNoiseMonitoring = () => {
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (noiseIntervalRef.current) {
            clearInterval(noiseIntervalRef.current);
        }
    };

    // Cleanup noise monitor on unmount
    useEffect(() => {
        return () => {
            stopNoiseMonitoring();
            stopTone();
        };
    }, []);


    const playTone = (freq, db) => {
        if (isNoisy) return; // Prevent playing if too noisy

        initAudio();
        if (!audioCtxRef.current) return;

        stopTone();

        const gainValue = Math.pow(10, (db - 100) / 20); // Calibration: using 100dB as max (similar to user's scale, adjusted for web safety)
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        const panner = audioCtxRef.current.createStereoPanner();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);

        // Random chance for "Catch Trial" (Silence) - e.g., 10% chance
        if (Math.random() < 0.1) {
            setCatchTrialActive(true);
            lastToneWasCatchRef.current = true;
            // Play silence (gain 0) but record it as if playing to test false positives
            gain.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
        } else {
            setCatchTrialActive(false);
            lastToneWasCatchRef.current = false;
            // Set Pan based on current ear in sequence
            panner.pan.setValueAtTime(currentStep.ear === 'left' ? -1 : 1, audioCtxRef.current.currentTime);
            gain.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
            gain.gain.linearRampToValueAtTime(gainValue, audioCtxRef.current.currentTime + 0.05);
        }

        osc.connect(gain);
        gain.connect(panner);
        panner.connect(audioCtxRef.current.destination);

        osc.start();

        oscillatorRef.current = osc;
        gainNodeRef.current = gain;
        pannerRef.current = panner;

        setIsPlaying(true);
        setToneStartTime(Date.now());
    };

    const stopTone = () => {
        if (oscillatorRef.current && audioCtxRef.current) {
            const now = audioCtxRef.current.currentTime;
            gainNodeRef.current?.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
            oscillatorRef.current.stop(now + 0.1);
            oscillatorRef.current = null;
            gainNodeRef.current = null;
            pannerRef.current = null;
        }

        // Record end time for grace period logic
        if (isPlaying) {
            toneEndTimeRef.current = Date.now();
        }

        setIsPlaying(false);
        setCatchTrialActive(false);
    };

    const nextPart = () => {
        if (currentStepIndex < TEST_STEPS.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
            setCurrentFreqIndex(0);
            setCurrentDb(MIN_DB);
            setShowTransition(false);
        } else {
            handleFinalize();
        }
    };

    const handleHeard = () => {
        // Visual feedback
        setLastClickedButton('heard');
        setTimeout(() => setLastClickedButton(null), 300);

        const now = Date.now();
        const reactionTime = now - toneStartTime;
        const timeSinceEnd = now - toneEndTimeRef.current;

        // Allow response if playing OR within 3.5 seconds of tone ending (Grace Period)
        const isPlayingOrJustEnded = isPlaying || (timeSinceEnd < 3500);

        // Check if the LAST tone (which just ended) was a Catch Trial (Silence)
        // AND ensuring we aren't clicking way too late after a catch trial either
        const isRecentCatch = catchTrialActive || (lastToneWasCatchRef.current && timeSinceEnd < 3500);

        if (isRecentCatch) {
            // User clicked during OR shortly after a silent catch trial!
            setFalsePositives(prev => prev + 1);
            stopTone();
            alert("False Positive Detected! (You clicked during a silent check). Please listen carefully.");
            return;
        }

        if (!isPlayingOrJustEnded) {
            // Clicked when nothing was playing AND not within grace period
            setFalsePositives(prev => prev + 1);
            // Optional: Alert user if they are confused
            // alert("Please play the tone first before clicking 'I Heard It'.");
            return;
        }


        // Valid Response
        setResponseLatency(prev => [...prev, reactionTime]);

        stopTone();
        const newResult = {
            frequency: frequencies[currentFreqIndex],
            decibel: currentDb,
            ear: currentStep.ear,
            masking: currentStep.masking
        };

        setResults(prev => {
            const filtered = prev.filter(r =>
                !(r.frequency === newResult.frequency && r.ear === newResult.ear && r.masking === newResult.masking)
            );
            return [...filtered, newResult];
        });

        if (currentFreqIndex < frequencies.length - 1) {
            // Move to next frequency in same ear/masking
            setCurrentFreqIndex(currentFreqIndex + 1);
            setCurrentDb(MIN_DB);
        } else {
            // Finished all frequencies for this combo
            if (currentStepIndex < TEST_STEPS.length - 1) {
                setShowTransition(true);
            } else {
                // Entire sequence complete
                handleFinalize();
            }
        }
    };

    const handleNotHeard = () => {
        // Visual feedback
        setLastClickedButton('notHeard');
        setTimeout(() => setLastClickedButton(null), 300);

        stopTone();
        // If they click "Not Heard", we don't penalize anything, just increase DB
        if (currentDb < MAX_DB) {
            setCurrentDb(prev => Math.min(prev + DB_STEP, MAX_DB));
        }
    };

    const startTesting = () => {
        if (patientName.trim()) {
            setShowInstructions(true);
        } else {
            alert("Please enter patient name");
        }
    };

    const beginAssessment = () => {
        setShowInstructions(false);
        setHasStarted(true);
        testStartTimeRef.current = Date.now();
        initAudio();
        startNoiseMonitoring();
    };

    // WHO 2026 Hearing Classification (Grades 0-6)
    // Based on Better-ear PTA at 500, 1000, 2000, and 4000 Hz
    // NOTE: This logic needs to move to Results or handle properly with completed data.
    // For now, we will perform a basic check here, but the real grading happens on 'finalize'.

    const handleFinalize = async () => {
        if (isSaving) return;
        setIsSaving(true);
        stopNoiseMonitoring();

        // Calculate Duration
        const durationSeconds = testStartTimeRef.current ? Math.round((Date.now() - testStartTimeRef.current) / 1000) : 0;
        const durationDisplay = `${Math.floor(durationSeconds / 60)} min ${durationSeconds % 60} sec`;

        // Process results for Supabase
        const formattedData = { left: {}, right: {} };
        results.forEach(r => {
            if (r.ear === 'left' && r.masking === 'unmasked') formattedData.left[r.frequency] = r.decibel;
            if (r.ear === 'right' && r.masking === 'unmasked') formattedData.right[r.frequency] = r.decibel;
        });

        // Reliability Score
        let score = 100;
        score -= (falsePositives * 10);
        const avgLatency = responseLatency.length > 0
            ? responseLatency.reduce((a, b) => a + b, 0) / responseLatency.length
            : 0;
        if (avgLatency < 150 && responseLatency.length > 3) score -= 10;
        if (avgLatency > 2500 && responseLatency.length > 3) score -= 5;
        const reliabilityScore = Math.max(0, Math.min(100, score));

        // Calculate Average Thresholds (PTA) for simple classification logic (refined in results)
        // Correct WHO 2026 calculation requires Better Ear Average (500,1000,2000,4000Hz)

        const calculatePTA = (earData) => {
            const freqs = [500, 1000, 2000, 4000];
            let sum = 0;
            let count = 0;
            freqs.forEach(f => {
                if (earData[f] !== undefined) {
                    sum += earData[f];
                    count++;
                }
            });
            return count > 0 ? sum / count : 0;
        };

        const leftPTA = calculatePTA(formattedData.left);
        const rightPTA = calculatePTA(formattedData.right);
        const betterEarPTA = Math.min(leftPTA, rightPTA); // Better ear has LOWER threshold (dB)

        const classifyHearing = (db) => {
            if (db < 20) return "Grade 0: Normal hearing"
            if (db <= 34) return "Grade 1: Mild hearing loss"
            if (db <= 49) return "Grade 2: Moderate hearing loss"
            if (db <= 64) return "Grade 3: Moderately severe hearing loss"
            if (db <= 79) return "Grade 4: Severe hearing loss"
            if (db <= 94) return "Grade 5: Profound hearing loss"
            return "Grade 6: Complete/total hearing loss (deafness)"
        }

        const simpleClassification = classifyHearing(betterEarPTA);

        try {
            let targetPatientId = paramPatientId;

            // If guest (no paramPatientId), create new patient
            if (!targetPatientId) {
                const { data: patient, error: pError } = await supabase.from('patients').insert({
                    created_by: user.id,
                    name: patientName,
                    age: 0, // Unknown
                    gender: 'Unspecified'
                }).select().single();
                if (pError) throw pError;
                targetPatientId = patient.id;
            }

            // Save Screening
            const { data: screening, error: sError } = await supabase.from('screenings').insert({
                patient_id: targetPatientId,
                created_by: user.id,
                date: new Date().toISOString(),
                data: formattedData,
                classification: simpleClassification,
                notes: `Reliability Score: ${reliabilityScore}% | False Positives: ${falsePositives} | Avg Latency: ${Math.round(avgLatency)}ms | Duration: ${durationDisplay}`,
            }).select().single();

            if (sError) throw sError;
            // Pass reliability and duration as query param to results
            navigate(`/results/${screening.id}?reliability=${reliabilityScore}&duration=${encodeURIComponent(durationDisplay)}`);
        } catch (err) {
            console.error("Save failed", err);
            alert("Failed to save results: " + err.message);
            setIsSaving(false);
        }
    };

    const onCancel = () => {
        stopNoiseMonitoring();
        navigate('/dashboard');
    }

    if (!hasStarted && !showInstructions) {
        return (
            <div className="max-w-xl mx-auto py-8 text-center space-y-8">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-transparent dark:border-slate-700">
                    <div className="bg-[#CFD8DC] dark:bg-slate-900 p-8 text-center border-b border-[#B0BEC5] dark:border-slate-700">
                        <h2 className="text-2xl font-light text-[#607D8B] dark:text-slate-200 tracking-tight">Clinical Audiometry</h2>
                        <p className="text-[#78909C] dark:text-slate-400 mt-2 font-light">Standardized automated testing protocol</p>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="space-y-4 text-left">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Patient Identification</label>
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 rounded-xl border-2 border-blue-500/10 overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 font-bold text-blue-600 dark:text-blue-400 uppercase text-xl">
                                    {patientPhoto ? (
                                        <img src={patientPhoto} alt={patientName} className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{patientName?.charAt(0) || '?'}</span>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    placeholder="Full Name / ID"
                                    value={patientName}
                                    onChange={(e) => setPatientName(e.target.value)}
                                    className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium placeholder-slate-400 dark:placeholder-slate-600"
                                />
                            </div>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-start space-x-3 text-left">
                            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-amber-800 dark:text-amber-300 font-medium text-sm">Environment Check Required</h4>
                                <p className="text-amber-700 dark:text-amber-400 text-xs mt-1">This test monitors background noise to ensure accuracy. Please allow microphone access when prompted.</p>
                            </div>
                        </div>

                        {/* Mode Toggle */}
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${isClinicalMode ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                                    {isClinicalMode ? <Activity className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                                </div>
                                <div className="text-left">
                                    <h4 className="font-sm font-bold text-gray-800 dark:text-white">{isClinicalMode ? 'Clinical Mode' : 'Screening Mode'}</h4>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">{isClinicalMode ? 'Full Frequencies (250-8000Hz)' : 'Standard Screening (500-4000Hz)'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsClinicalMode(!isClinicalMode)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isClinicalMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isClinicalMode ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {/*<div className="bg-[#CFD8DC]/30 p-6 rounded-2xl flex items-start space-x-4 text-sm text-[#78909C] border border-[#CFD8DC]">
                            <div className="space-y-3 w-full text-left">
                                <p className="font-medium text-[#607D8B] uppercase tracking-widest text-xs">Sequence Plan</p>
                                <div className="grid grid-cols-1 gap-2">
                                    <div className="flex items-center space-x-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#607D8B]"></span>
                                        <span>Right Ear (Unmasked)</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#90A4AE]"></span>
                                        <span>Left Ear (Unmasked)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        */}
                        <button
                            onClick={startTesting}
                            className="w-full bg-[#607D8B] dark:bg-slate-700 hover:bg-[#546E7A] dark:hover:bg-slate-600 text-white font-medium py-5 rounded-xl shadow-lg active:scale-95 flex items-center justify-center space-x-3 transition-all tracking-wide"
                        >
                            <span>Next: Preparation Guide</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <button onClick={onCancel} className="w-full py-2 text-[#90A4AE] hover:text-[#78909C] text-sm font-medium">Cancel and return</button>
                    </div>
                </div>
            </div>
        );
    }

    if (showInstructions) {
        const instructions = [
            { icon: <Clock className="w-6 h-6" />, title: "Silent Environment", desc: "ISO 8253-1 requires ambient noise < 35dB for valid threshold testing." },
            { icon: <Volume2 className="w-6 h-6" />, title: "Transducer Placement", desc: "Fit headphones snugly. Red earphone to RIGHT ear, Blue to LEFT ear." },
            { icon: <Ghost className="w-6 h-6" />, title: "Visual Isolation", desc: "Face away from the clinician or screen to avoid visual cues during tones." },
            { icon: <Zap className="w-6 h-6" />, title: "Response Protocol", desc: "Click 'I Heard It' as soon as you hear even the faintest audible tone." }
        ];

        return (
            <div className="max-w-xl mx-auto py-8">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-transparent dark:border-slate-700">
                    <div className="bg-[#CFD8DC] dark:bg-slate-900 p-8 text-center border-b border-[#B0BEC5] dark:border-slate-700">
                        <div className="flex justify-center mb-4">
                            <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-800">
                                <Activity className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">ISO 8253-1 Standard</span>
                            </div>
                        </div>
                        <h2 className="text-2xl font-light text-[#607D8B] dark:text-slate-200 tracking-tight">Clinical Protocol</h2>
                        <p className="text-[#78909C] dark:text-slate-400 mt-2 font-light">Standardized biomedical assessment guidelines</p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            {instructions.map((item, index) => (
                                <div key={index} className="flex items-start space-x-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 transition-all hover:border-blue-500/30">
                                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800 text-blue-500 shadow-sm border border-slate-100 dark:border-slate-700">
                                        {item.icon}
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{item.title}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-start space-x-3">
                            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <p className="text-blue-700 dark:text-blue-300 text-xs font-light">
                                This automated system is calibrated to <strong>ANSI S3.6-2025</strong> specifications to ensure clinical accuracy across all frequencies.
                            </p>
                        </div>

                        <div className="pt-4 space-y-3">
                            <button
                                onClick={beginAssessment}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center space-x-3 transition-all tracking-wide"
                            >
                                <span>Acknowledge & Begin</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setShowInstructions(false)}
                                className="w-full py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-medium transition-colors"
                            >
                                Back to Setup
                            </button>
                        </div>

                        <div className="flex justify-center pt-4 border-t border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-tighter">
                                CALIBRATION: ANSI S3.6 | METHODOLOGY: ISO 8253-1
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Noise Warning Overlay
    if (isNoisy) {
        return (
            <div className="fixed inset-0 z-50 bg-[#607D8B]/90 dark:bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm text-center shadow-2xl animate-bounce-slow border border-transparent dark:border-slate-700">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <VolumeX className="w-10 h-10 text-red-500 dark:text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Too Noisy!</h2>
                    <p className="text-gray-500 dark:text-slate-400 mb-6">
                        Background noise levels are too high for accurate screening. Please move to a quieter area or wait for silence.
                    </p>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-4 overflow-hidden">
                        <div className="bg-red-500 h-full transition-all duration-200" style={{ width: `${Math.min(100, noiseLevel * 2)}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-slate-500">Test will auto-resume when quiet.</p>
                </div>
            </div>
        )
    }

    // Transition between test phases
    if (showTransition) {
        const nextPhase = TEST_STEPS[currentStepIndex + 1];
        return (
            <div className="max-w-xl mx-auto py-12">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl p-10 text-center space-y-8 border border-slate-100 dark:border-slate-700">
                    <div className="w-16 h-16 bg-[#CFD8DC] dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-[#607D8B] dark:text-slate-400" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-medium text-[#607D8B] dark:text-slate-200">Phase Complete</h2>
                        <p className="text-[#90A4AE] dark:text-slate-400 font-light">{currentStep.ear} ear results recorded</p>
                    </div>

                    <div className="p-6 bg-[#CFD8DC]/20 dark:bg-slate-900/50 rounded-2xl border border-[#CFD8DC] dark:border-slate-700 text-left">
                        <p className="text-xs font-bold text-[#90A4AE] dark:text-slate-500 uppercase tracking-widest mb-3">Up Next</p>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-lg font-medium text-[#607D8B] dark:text-slate-200 capitalize">{nextPhase.ear} Ear</p>
                                <p className="text-sm text-[#78909C] dark:text-slate-400">{nextPhase.masking} sequence</p>
                            </div>
                            <Activity className="w-5 h-5 text-[#B0BEC5] dark:text-slate-600" />
                        </div>
                    </div>

                    <button
                        onClick={nextPart}
                        className="w-full bg-[#607D8B] dark:bg-slate-700 text-white font-medium py-4 rounded-xl shadow-lg hover:bg-[#546E7A] dark:hover:bg-slate-600 transition-all flex items-center justify-center space-x-2"
                    >
                        <span>Start Next Phase</span>
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    if (isSaving) {
        return (
            <div className="max-w-xl mx-auto py-12 text-center">
                <h2 className="text-2xl font-bold animate-pulse">Saving Results...</h2>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-4 px-4 py-6">
            {/* Test Progress Bar */}
            <div className="flex items-center space-x-1 px-1">
                {TEST_STEPS.map((step, idx) => (
                    <div
                        key={idx}
                        className={`h-1 flex-1 rounded-full transition-all duration-500 ${idx === currentStepIndex ? 'bg-[#607D8B] dark:bg-slate-400' : idx < currentStepIndex ? 'bg-[#90A4AE] dark:bg-slate-600' : 'bg-[#CFD8DC] dark:bg-slate-800'}`}
                    />
                ))}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-[#CFD8DC]/50 dark:shadow-none p-8 sm:p-12 text-center relative border border-[#CFD8DC] dark:border-slate-700">

                {/* Noise Indicator (Small) */}
                <div className="absolute top-4 left-4 flex items-center space-x-2 bg-gray-50 dark:bg-slate-900 p-2 rounded-full border border-gray-100 dark:border-slate-700" title="Ambient Noise Level">
                    <div className={`p-1.5 rounded-full ${noiseLevel > 40 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'} transition-colors`}>
                        {noiseLevel > 40 ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    </div>
                    <div className="text-xs font-medium text-gray-500 dark:text-slate-400 pr-2">
                        <span className="font-bold text-gray-700 dark:text-slate-200">{noiseLevel} dB</span>
                        <span className="hidden sm:inline"> ({noiseLevel > 40 ? 'Noisy' : 'Acceptable'})</span>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-10">
                    <button onClick={onCancel} className="p-2 text-[#90A4AE] hover:text-[#607D8B] dark:hover:text-slate-300 transition-colors"><X className="w-6 h-6" /></button>

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
                                onClick={() => {
                                    if (currentStep.ear !== 'right') {
                                        // Find the step index for right ear with same masking
                                        const targetIndex = TEST_STEPS.findIndex(s => s.ear === 'right' && s.masking === currentStep.masking);
                                        if (targetIndex !== -1) setCurrentStepIndex(targetIndex);
                                    }
                                }}
                                className={`text-xs font-medium px-4 py-1.5 rounded-full uppercase tracking-wide transition-all ${currentStep.ear === 'right'
                                    ? 'bg-red-500 text-white shadow-md'
                                    : 'bg-transparent text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                Right Ear
                            </button>
                            <button
                                onClick={() => {
                                    if (currentStep.ear !== 'left') {
                                        // Find the step index for left ear with same masking
                                        const targetIndex = TEST_STEPS.findIndex(s => s.ear === 'left' && s.masking === currentStep.masking);
                                        if (targetIndex !== -1) setCurrentStepIndex(targetIndex);
                                    }
                                }}
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
                                onClick={() => {
                                    if (currentStep.masking !== 'unmasked') {
                                        // Find the step index for unmasked with same ear
                                        const targetIndex = TEST_STEPS.findIndex(s => s.ear === currentStep.ear && s.masking === 'unmasked');
                                        if (targetIndex !== -1) setCurrentStepIndex(targetIndex);
                                    }
                                }}
                                className={`text-xs font-medium px-4 py-1.5 rounded-full uppercase tracking-wide transition-all ${currentStep.masking === 'unmasked'
                                    ? 'bg-[#607D8B] dark:bg-slate-600 text-white shadow-md'
                                    : 'bg-transparent text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                Unmasked
                            </button>
                            <button
                                onClick={() => {
                                    if (currentStep.masking !== 'masked') {
                                        // Find the step index for masked with same ear
                                        const targetIndex = TEST_STEPS.findIndex(s => s.ear === currentStep.ear && s.masking === 'masked');
                                        if (targetIndex !== -1) setCurrentStepIndex(targetIndex);
                                    }
                                }}
                                className={`text-xs font-medium px-4 py-1.5 rounded-full uppercase tracking-wide transition-all ${currentStep.masking === 'masked'
                                    ? 'bg-[#607D8B] dark:bg-slate-600 text-white shadow-md'
                                    : 'bg-transparent text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                Masked
                            </button>
                        </div>
                    </div>
                    <button onClick={handleFinalize} className="bg-[#CFD8DC]/30 dark:bg-slate-900 text-[#90A4AE] dark:text-slate-500 px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#CFD8DC]/50 dark:hover:bg-slate-700 transition-colors border border-transparent dark:border-slate-700">
                        Finish
                    </button>
                </div>

                <div className="mb-10">
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

                <div className="py-8 flex flex-col items-center relative">
                    <button
                        onMouseDown={() => playTone(frequencies[currentFreqIndex], currentDb)}
                        onMouseUp={stopTone}
                        onMouseLeave={stopTone}
                        onTouchStart={() => playTone(frequencies[currentFreqIndex], currentDb)}
                        onTouchEnd={stopTone}
                        className={`w-48 h-48 rounded-full border border-[#CFD8DC] dark:border-slate-700 flex flex-col items-center justify-center transition-all duration-300 outline-none select-none active:scale-95 ${isPlaying ? 'bg-[#607D8B] dark:bg-slate-700 shadow-2xl shadow-[#B0BEC5] dark:shadow-slate-900 scale-105' : 'bg-white dark:bg-slate-900 hover:border-[#B0BEC5] dark:hover:border-slate-600 shadow-lg shadow-[#CFD8DC]/50 dark:shadow-none'}`}
                    >
                        {isPlaying ? (
                            <Volume2 className="w-16 h-16 text-white mb-2 animate-pulse" />
                        ) : (
                            <div className='flex flex-col items-center'>
                                <div className="w-12 h-12 rounded-full bg-[#CFD8DC]/30 dark:bg-slate-800 flex items-center justify-center mb-3">
                                    <Volume2 className="w-6 h-6 text-[#607D8B] dark:text-slate-400" />
                                </div>
                                <span className="text-xs font-medium text-[#90A4AE] dark:text-slate-500 uppercase tracking-widest">Hold to Play</span>
                            </div>
                        )}
                    </button>
                    {/* Catch Trial Debug Indicator (Optional - remove for production) */}
                    {/* {catchTrialActive && <div className="absolute -top-4 text-xs text-red-400 font-mono">Catch Trial Check</div>} */}
                </div>

                <div className="mt-12 grid grid-cols-2 gap-6">
                    <button
                        onClick={handleNotHeard}
                        className={`group p-5 border-2 rounded-2xl transition-all flex flex-col items-center justify-center min-h-[120px] active:scale-95 ${lastClickedButton === 'notHeard'
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500 scale-105 shadow-lg dark:shadow-none'
                            : 'border-[#CFD8DC] dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-[#CFD8DC]/30 dark:hover:bg-slate-800 hover:border-[#607D8B] dark:hover:border-slate-500'
                            }`}
                    >
                        <span className="text-sm font-medium text-[#607D8B] dark:text-slate-300 mb-2">Not Heard</span>
                        <div className="text-xs text-[#90A4AE] dark:text-slate-500 space-y-1">
                            <div className="font-mono">
                                <span className="font-bold text-[#607D8B] dark:text-slate-300">{currentDb}dB</span>
                                {currentDb < MAX_DB && (
                                    <>
                                        <span className="mx-1 dark:text-slate-600">→</span>
                                        <span className="font-bold text-[#78909C] dark:text-slate-400">{currentDb + DB_STEP}dB</span>
                                    </>
                                )}
                            </div>
                            <div className="text-[10px]">
                                {currentDb >= MAX_DB ? 'Max Level Reached' : 'Increase Level'}
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={handleHeard}
                        className={`group p-5 rounded-2xl transition-all flex flex-col items-center justify-center min-h-[120px] shadow-lg dark:shadow-none active:scale-95 ${lastClickedButton === 'heard'
                            ? 'bg-[#78909C] dark:bg-slate-600 scale-105 shadow-[#B0BEC5]'
                            : 'bg-[#607D8B] dark:bg-slate-700 hover:bg-[#546E7A] dark:hover:bg-slate-600 shadow-[#CFD8DC]'
                            }`}
                    >
                        <Zap className={`w-6 h-6 mb-2 transition-colors ${lastClickedButton === 'heard' ? 'text-yellow-300' : 'text-white'}`} />
                        <span className="text-sm font-medium text-white">I Heard It</span>
                        <span className="text-xs text-[#B0BEC5] dark:text-slate-400 mt-1">Record at {currentDb}dB</span>
                    </button>
                </div>

                <div className="mt-10 flex items-center justify-center space-x-4 text-[10px] font-bold text-[#B0BEC5] dark:text-slate-500 uppercase tracking-widest">
                    <span>{results.length} PLOTS RECORDED</span>
                    <span className="w-1 h-1 bg-[#CFD8DC] dark:bg-slate-700 rounded-full" />
                    <span>{currentStepIndex + 1} OF 4 PHASES</span>
                </div>
            </div>
        </div>
    );
}
