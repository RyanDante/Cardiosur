# CardioSur - Heart Sound Monitor 🫀

A progressive web application (PWA) for real-time heart sound monitoring and analysis using phonocardiography (PCG) technology. CardioSur captures heart sounds through your device's microphone, analyzes them using AI, and provides instant health insights with professional recommendations.

![Version](https://img.shields.io/badge/Version-1.0.0-6dfa7e)
![React](https://img.shields.io/badge/React-19.0-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![PWA](https://img.shields.io/badge/PWA-Enabled-5a0fc8)

## ✨ Features

### 🔬 Real-Time Heart Sound Analysis
- **Live PCG Recording**: Capture heart sounds using device microphone
- **Real-time BPM Detection**: Calculate heart rate from audio peaks
- **Heart Rate Variability (HRV)**: Measure RMSSD for stress assessment
- **Signal Quality Monitoring**: Adaptive threshold detection for accurate readings
- **Live Waveform Visualization**: Real-time audio waveform display during recording

### 🤖 AI-Powered Health Insights
- **Backend ML Model**: Phonocardiography AI classifies heart sounds as Normal/Abnormal
- **Confidence Scoring**: Shows prediction reliability percentage
- **AI Health Summary**: Gemini AI provides personalized health analysis
- **Severity Assessment**: Automatic LOW/MODERATE/HIGH risk classification
- **Smart Recommendations**: Personalized health advice based on your data
- **Doctor Finder**: Locates nearest cardiologist for severe cases

### 📊 Comprehensive Health Metrics
- **Heart Rate (BPM)**: Real-time and backend-calculated
- **HRV (ms)**: Heart rate variability for stress analysis
- **Stress Level**: NORMAL, MODERATE, or HIGH
- **Risk Assessment**: Low, Moderate, or High risk categorization
- **Audio Playback**: Listen to recorded heart sounds
- **Class Probabilities**: Detailed breakdown of AI predictions

### 📱 Progressive Web App (PWA)
- **Installable**: Add to home screen like a native app
- **Offline Capable**: Service worker caches app resources
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Native App Feel**: Standalone mode without browser UI
- **Cross-Platform**: iOS, Android, Windows, macOS, Linux

### 🎨 User Experience
- **Guided Onboarding**: Step-by-step instructions with visual cues
- **Live Coaching Messages**: Encouraging prompts during recording
- **Animated UI**: Smooth transitions and micro-interactions
- **Dark/Light Themes**: Professional medical-grade interface
- **5-Second Countdown**: Preparation time before recording
- **30-Second Recording**: Optimal duration for accurate analysis

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI library with hooks and functional components
- **TypeScript 5.8** - Type-safe JavaScript development
- **Vite 6.2** - Fast build tool and dev server
- **Motion (Framer Motion)** - Smooth animations and transitions
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful, customizable icons

### Audio Processing
- **Web Audio API** - Real-time audio processing and analysis
- **MediaRecorder API** - Audio capture and recording
- **AudioContext** - Advanced audio graph with filters
- **AnalyserNode** - Real-time frequency and waveform data
- **BiquadFilter** - Highpass/lowpass filters for heart sound isolation

### AI & Machine Learning
- **Google Gemini AI** - Natural language health analysis
- **Custom Backend API** - Phonocardiography ML model
- **WAV Conversion** - Audio format standardization
- **Peak Detection Algorithm** - S1/S2 heart sound identification

### PWA & Performance
- **Service Worker** - Offline caching and background sync
- **Web App Manifest** - Installability and metadata
- **Cache API** - Resource caching for offline access
- **Vercel Analytics** - Performance and usage tracking

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Modern web browser with Web Audio API support
- Device with microphone (phone, laptop, or tablet)
- HTTPS connection (required for microphone access on mobile)

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/your-username/cardiosur.git
cd cardiosur
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your API keys
GEMINI_API_KEY=your_gemini_api_key_here
APP_URL=http://localhost:3000
```

4. **Start development server**
```bash
npm run dev
```

5. **Open in browser**
```
http://localhost:3000
```

### Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm run build
netlify deploy --prod
```

## 📖 How It Works

### Recording Flow

```
1. User opens app
   ↓
2. Views onboarding (first time only)
   ↓
3. Reads instructions with torso diagram
   ↓
4. Clicks "Start" → Browser requests microphone permission
   ↓
5. 5-second countdown (get ready)
   ↓
6. 30-second recording begins
   • Live waveform visualization
   • Real-time BPM detection
   • Coaching messages appear
   ↓
7. Recording stops automatically
   ↓
8. Audio processed and analyzed
   ↓
9. Results displayed with:
   • Heart rate & HRV
   • Stress level
   • Risk assessment
   • AI prediction
   • Audio playback
   ↓
10. User clicks "Get Full Results"
    ↓
11. AI analyzes data and provides:
    • Health summary
    • Severity assessment
    • Recommendations
    • Doctor referral (if needed)
```

### Audio Processing Pipeline

```
Microphone Input
   ↓
Highpass Filter (18Hz) - Remove sub-bass rumble
   ↓
Lowpass Filter (2000Hz) - Remove high-frequency noise
   ↓
Second Lowpass (2000Hz) - Steeper rolloff (24dB/oct)
   ↓
Gain Stage - Signal amplification
   ↓
AnalyserNode - Real-time waveform data
   ↓
Peak Detection Algorithm
   • Adaptive threshold
   • Refractory period (300ms)
   • Rolling window (12 peaks)
   ↓
BPM Calculation
   • RR interval averaging
   • Physiological range clamping (30-220 BPM)
   ↓
HRV Calculation (RMSSD)
   • Successive RR differences
   • Root mean square
   ↓
Signal Quality Assessment
   • Variance-based heuristic
   • good / weak / noisy
```

## 🔑 API Configuration

### Gemini AI Setup

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with Google account
3. Create API key in Settings
4. Add to `.env` file:
```env
GEMINI_API_KEY=your_api_key_here
```

### Backend API

The app connects to a backend ML model for heart sound classification:
```typescript
const API_URL = "https://cardiosur-api.onrender.com/api/predict";
```

To use your own backend:
1. Update `API_URL` in `src/App.tsx`
2. Ensure endpoint accepts WAV audio files
3. Return JSON with prediction results

## 📱 PWA Installation

### Android (Chrome)
1. Visit HTTPS URL
2. Install banner appears at bottom
3. Tap "Install"
4. App added to home screen

### iOS (Safari)
1. Visit HTTPS URL
2. Tap Share button
3. Scroll to "Add to Home Screen"
4. Tap "Add"

### Desktop (Chrome/Edge)
1. Install icon in address bar
2. Click "Install"
3. App opens in standalone window

## 🎯 Usage Guide

### Best Practices for Recording

1. **Environment**: Quiet room, minimal background noise
2. **Position**: Phone microphone on chest (marked positions shown)
3. **Posture**: Sit or lie down comfortably
4. **Movement**: Stay still during recording
5. **Breathing**: Breathe normally, don't hold breath
6. **Duration**: Full 30 seconds for best results

### Understanding Results

**Heart Rate (BPM)**
- Normal: 60-100 BPM
- Bradycardia: <60 BPM
- Tachycardia: >100 BPM

**HRV (ms)**
- High HRV (>50ms): Good, indicates healthy heart
- Low HRV (<20ms): May indicate stress or health issues

**Stress Level**
- NORMAL: Healthy HRV range
- MODERATE: Elevated stress indicators
- HIGH: Low HRV, consult doctor

**AI Prediction**
- Normal: Heart sounds appear healthy
- Abnormal: Unusual patterns detected
- Confidence: AI certainty percentage

## 📁 Project Structure

```
CardioSur/
├── public/
│   ├── icon.svg              # App icon
│   ├── manifest.json         # PWA manifest
│   └── sw.js                 # Service worker
├── src/
│   ├── components/
│   │   ├── InstallPrompt.tsx         # PWA install banner
│   │   ├── LiveWaveform.tsx          # Real-time waveform display
│   │   ├── OnboardingScreen.tsx      # First-time user guide
│   │   └── AIDiagnosisModal.tsx      # AI health analysis modal
│   ├── hooks/
│   │   └── useHeartAudio.ts          # Heart audio processing hook
│   ├── pages/
│   │   └── ResultsPage.tsx           # Results display page
│   ├── App.tsx                       # Main application component
│   ├── index.css                     # Global styles
│   └── main.tsx                      # Entry point
├── assets/
│   ├── images/                       # App images
│   └── videos/                       # Background animations
├── .env.example                      # Environment variables template
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # TypeScript configuration
├── vite.config.ts                    # Vite configuration
└── README.md                         # This file
```

## 🔒 Privacy & Security

- **Local Processing**: Audio analysis happens on device
- **No Data Storage**: Recordings not saved permanently
- **Secure Transmission**: HTTPS for all API calls
- **User Consent**: Explicit microphone permission required
- **HIPAA Considerations**: Not a medical device, for informational purposes only

## ⚠️ Medical Disclaimer

**IMPORTANT**: CardioSur is NOT a medical device and should NOT replace professional medical advice.

- Results are for informational purposes only
- Always consult qualified healthcare providers
- Do not ignore professional medical advice
- Do not delay seeking medical treatment
- In emergencies, call your local emergency number immediately

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Google AI Studio** - Gemini AI integration
- **Render.com** - Backend API hosting
- **Vercel** - Frontend hosting and analytics
- **Web Audio API** - Browser audio capabilities
- **Open-source community** - React, Vite, Tailwind CSS

## 📞 Support

- **Documentation**: [AI_DIAGNOSIS_SETUP.md](AI_DIAGNOSIS_SETUP.md)
- **Issues**: [GitHub Issues](https://github.com/your-username/cardiosur/issues)

## 🗺️ Roadmap

- [ ] Historical data tracking and trends
- [ ] Export reports as PDF
- [ ] Multi-language support
- [ ] Integration with health apps (Apple Health, Google Fit)
- [ ] Real-time ECG waveform display
- [ ] User accounts and cloud sync
- [ ] Advanced analytics dashboard
- [ ] Telemedicine integration

---

**Built with ❤️ for better heart health**

*CardioSur - Making heart health monitoring accessible to everyone*
