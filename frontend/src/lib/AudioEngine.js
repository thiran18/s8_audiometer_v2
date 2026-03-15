class AudioEngine {
    constructor() {
        this.ctx = null;
        this.oscillator = null;
        this.gainNode = null;
        this.isPlaying = false;
    }

    // Initialize the AudioContext (must be called after user interaction)
    async init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.ctx.createGain();
            this.gainNode.connect(this.ctx.destination);
            this.gainNode.gain.value = 0; // Start silent
        }
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    /**
     * Starts a pure tone at the specified frequency and dB level.
     * @param {number} frequency - Frequency in Hz (e.g., 1000)
     * @param {number} dbHL - Decibels Hearing Level (approximate calibration)
     */
    playTone(frequency, dbHL) {
        if (!this.ctx) return;

        // Stop existing tone if any
        if (this.isPlaying) {
            this.stopTone();
        }

        // Create Oscillator
        this.oscillator = this.ctx.createOscillator();
        this.oscillator.type = 'sine';
        this.oscillator.frequency.value = frequency;
        this.oscillator.connect(this.gainNode);

        // Convert dbHL to Gain (0.0 to 1.0)
        // Note: This is a simplified linear approximation. 
        // Real audiometers need specific calibration per headphone.
        // Human ears are naturally less sensitive to low frequencies (like 250Hz), requiring more energy
        const RETSPL_OFFSETS = { 250: 18.5, 500: 4.5, 1000: 0, 2000: 2.5, 4000: 2.5, 8000: 6.0 };
        const offset = RETSPL_OFFSETS[frequency] || 0;
        const compensatedDb = dbHL + offset;

        // Formula: gain = 10 ^ ((db - Max_Output) / 20)
        // For web safety, we map 0-100dB roughly to 0-1 gain with a safety cap.
        const gain = this.dbToGain(compensatedDb);

        // Ramp up to avoid click
        const now = this.ctx.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(0, now);
        this.gainNode.gain.linearRampToValueAtTime(gain, now + 0.05);

        this.oscillator.start(now);
        this.isPlaying = true;
    }

    stopTone() {
        if (!this.ctx || !this.oscillator || !this.isPlaying) return;

        const now = this.ctx.currentTime;
        // Ramp down to avoid click
        this.gainNode.gain.cancelScheduledValues(now);

        // We can't query current value easily, so we ramp to 0
        this.gainNode.gain.linearRampToValueAtTime(0, now + 0.05);

        // Stop oscillator after ramp
        this.oscillator.stop(now + 0.1);

        // Cleanup matches oscillator lifecycle
        const oldOsc = this.oscillator;
        setTimeout(() => {
            if (oldOsc === this.oscillator) {
                this.oscillator.disconnect();
                this.oscillator = null;
                this.isPlaying = false;
            }
        }, 100);
    }

    // Example Calibration: 0dB HL is barely audible, 80dB is loud.
    // Web Audio Gain 1.0 is "Full Volume".
    // We treat 100dB as Gain 1.0 (Safety limit).
    dbToGain(db) {
        // Clamp db betwen -10 and 100
        const clamped = Math.max(-10, Math.min(db, 100));

        // Simple log scale mapping
        // 100dB = 1.0
        // Using standard acoustic formula: Gain = 10^(dB/20) normalized
        // Let's assume Max Volume (System 100%) = 80dB HL (approx for phone)
        // Shifting the reference to 80 allows lower dBs to be audible on consumer gear 
        // without destroying the mathematical relationship of the tones.
        return Math.pow(10, (clamped - 80) / 20);
    }
}

// Export a single instance
export const audio = new AudioEngine();
