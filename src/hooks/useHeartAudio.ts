/**
 * Real-time heart sound BPM detection using Web Audio API
 *
 * Pipeline:
 * mic → highpass(18Hz) → lowpass(150Hz) → lowpass(150Hz) → gain(20x)
 *     → analyser → peak detection → BPM + HRV calculation
 *
 * Filtered stream also recorded separately for playback.
 * Heart sounds (S1/S2) live at 20–150Hz.
 * S1 ("lub") is the dominant peak used for BPM timing.
 */

export interface HeartAudioResult {
  bpm: number;
  hrv: number;
  s1Detected: boolean;
  s2Detected: boolean;
  signalQuality: "good" | "weak" | "noisy";
}

export class HeartAudioProcessor {
  // ── Audio graph nodes ──────────────────────────────────
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private stream: MediaStream | null = null;

  // ── Raw recorder (sent to backend) ────────────────────
  private mediaRecorder: MediaRecorder | null = null;
  private recordingChunks: Blob[] = [];

  // ── Filtered recorder (playback in UI) ────────────────
  private filteredMediaRecorder: MediaRecorder | null = null;
  private filteredRecordingChunks: Blob[] = [];

  // ── Peak detection state ───────────────────────────────
  private peakTimes: number[] = [];
  private lastPeakTime: number = 0;
  private refractory: number = 300; // ms — enforces max ~200 BPM
  private animFrameId: number | null = null;

  // ── Callbacks ──────────────────────────────────────────
  private onBpmUpdate: ((result: HeartAudioResult) => void) | null = null;
  private onBeatFlash: (() => void) | null = null;
  private onSignalLevel: ((level: number) => void) | null = null;

  // ─────────────────────────────────────────────────────
  // PUBLIC: start()
  // ─────────────────────────────────────────────────────
  async start(
    onUpdate: (result: HeartAudioResult) => void,
    onRecordingReady: (rawBlob: Blob, filteredBlob: Blob) => void,
    onError: (msg: string) => void,
    onBeat?: () => void,
    onSignalLevel?: (level: number) => void
  ) {
    this.onBpmUpdate = onUpdate;
    this.onBeatFlash = onBeat ?? null;
    this.onSignalLevel = onSignalLevel ?? null;

    // ── 1. Request microphone — raw, no processing ───────
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 44100,
          deviceId: "default",
        },
      });
    } catch {
      onError(
        "Microphone access denied. Please allow microphone access and try again."
      );
      return;
    }

    // ── 2. Build filter chain ────────────────────────────
    this.audioCtx = new AudioContext({ sampleRate: 44100 });
    this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);

    // Highpass at 18Hz — removes sub-bass rumble + mic handling noise
    const highpass = this.audioCtx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 18;
    highpass.Q.value = 0.7;

    // Lowpass at 150Hz — removes speech (300Hz+), breathing, ambient noise
    const lowpass = this.audioCtx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 2000;
    lowpass.Q.value = 0.7;

    // Second lowpass cascaded — steeper rolloff (24dB/octave total)
    const lowpass2 = this.audioCtx.createBiquadFilter();
    lowpass2.type = "lowpass";
    lowpass2.frequency.value = 2000;
    lowpass2.Q.value = 0.7;

    // Gain — normal mic level, no boost needed for regular audio
    const gainNode = this.audioCtx.createGain();
    gainNode.gain.value = 1;

    // Analyser — reads filtered waveform buffer for peak detection
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.3;

    // Chain: source → hp → lp → lp2 → gain → analyser
    this.sourceNode
      .connect(highpass)
      .connect(lowpass)
      .connect(lowpass2)
      .connect(gainNode)
      .connect(this.analyserNode);

    // ── 3. Raw recorder — captures unfiltered mic stream ─
    const rawMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: rawMime });
    this.recordingChunks = [];

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordingChunks.push(e.data);
    };

    // ── 4. Filtered recorder — taps AFTER filter + gain ──
    const filteredDest = this.audioCtx.createMediaStreamDestination();
    gainNode.connect(filteredDest);

    const filteredMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    this.filteredMediaRecorder = new MediaRecorder(filteredDest.stream, {
      mimeType: filteredMime,
    });
    this.filteredRecordingChunks = [];

    this.filteredMediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.filteredRecordingChunks.push(e.data);
    };

    // ── 5. Wait for BOTH recorders to stop before firing callback ──
    let rawBlob: Blob | null = null;
    let filteredBlob: Blob | null = null;

    const checkBothReady = () => {
      if (rawBlob && filteredBlob) {
        onRecordingReady(rawBlob, filteredBlob);
      }
    };

    this.mediaRecorder.onstop = () => {
      rawBlob = new Blob(this.recordingChunks, { type: rawMime });
      checkBothReady();
    };

    this.filteredMediaRecorder.onstop = () => {
      filteredBlob = new Blob(this.filteredRecordingChunks, {
        type: filteredMime,
      });
      checkBothReady();
    };

    // ── 6. Start both recorders ───────────────────────────
    this.mediaRecorder.start(500);
    this.filteredMediaRecorder.start(500);

    // ── 7. Start peak detection loop ─────────────────────
    this.detectPeaks();
  }

  // ─────────────────────────────────────────────────────
  // PRIVATE: detectPeaks()
  // Runs every animation frame, reads filtered waveform,
  // detects S1 peaks, fires beat callback + BPM update
  // ─────────────────────────────────────────────────────
  private detectPeaks() {
    if (!this.analyserNode || !this.audioCtx) return;

    const bufferLength = this.analyserNode.fftSize;
    const dataArray = new Float32Array(bufferLength);

    let threshold = 0.0040;  // starting threshold — lower for better sensitivity (was 0.015)
    let signalMax = 0;
    let frameCount = 0;

    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
      this.analyserNode!.getFloatTimeDomainData(dataArray);

      const now = this.audioCtx!.currentTime * 1000; // convert to ms

      // Find peak amplitude in this frame
      let framePeak = 0;
      for (let i = 0; i < bufferLength; i++) {
        const abs = Math.abs(dataArray[i]);
        if (abs > framePeak) framePeak = abs;
      }

      // Track running signal max
      if (framePeak > signalMax) signalMax = framePeak;
      frameCount++;

      // Report signal level for debug visualization (every 10 frames ~6Hz)
      if (frameCount % 10 === 0) {
        this.onSignalLevel?.(framePeak);
      }

      // Every ~1 second: adapt threshold to 40% of recent peak max
      // This means weak signals still get detected, strong signals
      // don't flood with false positives
      if (frameCount % 60 === 0) {
        if (signalMax > 0.005) {
          threshold = signalMax * 0.4;
        }
        signalMax = signalMax * 0.95; // slowly decay so threshold drops
      }

      // Peak detected: above threshold AND refractory period elapsed
      if (
        framePeak > threshold &&
        now - this.lastPeakTime > this.refractory
      ) {
        this.lastPeakTime = now;
        this.peakTimes.push(now);

        // Fire visual beat flash callback
        this.onBeatFlash?.();

        // Keep rolling window of last 12 peaks
        if (this.peakTimes.length > 12) {
          this.peakTimes.shift();
        }

        // Need at least 3 peaks for a meaningful BPM + HRV estimate
        if (this.peakTimes.length >= 3) {
          const result = this.calculate();
          this.onBpmUpdate?.(result);
        }
      }
    };

    loop();
  }

  // ─────────────────────────────────────────────────────
  // PRIVATE: calculate()
  // Computes BPM and HRV from stored peak timestamps
  // ─────────────────────────────────────────────────────
  private calculate(): HeartAudioResult {
    // RR intervals = time between consecutive S1 peaks
    const rrIntervals: number[] = [];
    for (let i = 1; i < this.peakTimes.length; i++) {
      rrIntervals.push(this.peakTimes[i] - this.peakTimes[i - 1]);
    }

    // Discard physiologically impossible intervals
    // 300ms = 200 BPM max, 1500ms = 40 BPM min
    const validRR = rrIntervals.filter((rr) => rr >= 300 && rr <= 1500);

    if (validRR.length === 0) {
      return {
        bpm: 0,
        hrv: 0,
        s1Detected: false,
        s2Detected: false,
        signalQuality: "weak",
      };
    }

    // BPM from average RR interval
    const avgRR = validRR.reduce((a, b) => a + b, 0) / validRR.length;
    const bpm = Math.round(60000 / avgRR);

    // HRV via RMSSD — clinical gold standard for short-term HRV
    // = root mean square of successive RR differences
    let rmssd = 0;
    if (validRR.length >= 2) {
      const squaredDiffs: number[] = [];
      for (let i = 1; i < validRR.length; i++) {
        squaredDiffs.push(Math.pow(validRR[i] - validRR[i - 1], 2));
      }
      rmssd = Math.round(
        Math.sqrt(
          squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length
        )
      );
    }

    // Signal quality heuristic based on RR variance
    const rrVariance = Math.max(...validRR) - Math.min(...validRR);
    const signalQuality: HeartAudioResult["signalQuality"] =
      validRR.length < 3
        ? "weak"
        : rrVariance > 400
        ? "noisy"   // high variance = motion artifact likely
        : "good";

    // S2 heuristic: short RR (<600ms) suggests both S1 and S2 were caught
    const hasS2 = validRR.some((rr) => rr < 600);

    return {
      bpm: Math.max(30, Math.min(220, bpm)), // clamp to physiological range
      hrv: rmssd,
      s1Detected: validRR.length >= 2,
      s2Detected: hasS2,
      signalQuality,
    };
  }

  // ─────────────────────────────────────────────────────
  // PUBLIC: stop()
  // Stops both recorders, releases mic, closes AudioContext
  // onstop handlers fire → checkBothReady → onRecordingReady
  // ─────────────────────────────────────────────────────
  stop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.stop();
    }
    if (this.filteredMediaRecorder?.state === "recording") {
      this.filteredMediaRecorder.stop();
    }

    this.stream?.getTracks().forEach((t) => t.stop());
    this.audioCtx?.close();

    // Reset peak state
    this.peakTimes = [];
    this.lastPeakTime = 0;
  }

  // ─────────────────────────────────────────────────────
  // PUBLIC: getWaveformData()
  // Returns current filtered waveform buffer for live
  // canvas visualisation — call this in a requestAnimationFrame
  // ─────────────────────────────────────────────────────
  getWaveformData(): Float32Array | null {
    if (!this.analyserNode) return null;
    const data = new Float32Array(this.analyserNode.fftSize);
    this.analyserNode.getFloatTimeDomainData(data);
    return data;
  }
}

// ─────────────────────────────────────────────────────
// UTILITY: Convert WebM/Opus Blob to WAV format
// Returns a new Blob with audio/wav MIME type
// ─────────────────────────────────────────────────────
export async function convertToWav(webmBlob: Blob): Promise<Blob> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Decode the WebM audio
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Create WAV file
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  
  // Interleave channels
  const interleaved = interleaveChannels(audioBuffer);
  const dataLength = interleaved.length * bytesPerSample;
  
  // Create WAV header
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  
  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Write audio data
  const offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset + i * 2, sample * 0x7FFF, true);
  }
  
  await audioContext.close();
  
  return new Blob([buffer], { type: 'audio/wav' });
}

function interleaveChannels(audioBuffer: AudioBuffer): Float32Array {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const result = new Float32Array(length * numberOfChannels);
  
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      result[i * numberOfChannels + channel] = audioBuffer.getChannelData(channel)[i];
    }
  }
  
  return result;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}