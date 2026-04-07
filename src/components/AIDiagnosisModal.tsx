import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, AlertTriangle, Heart, Activity, MapPin } from 'lucide-react';

interface AIDiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  bpm: number;
  hrv: number;
  stress: string;
  risk: string;
  prediction?: {
    result?: string;
    predicted_label?: string;
    bpm?: number;
    confidence?: number;
    [key: string]: any;
  } | null;
}

export default function AIDiagnosisModal({
  isOpen,
  onClose,
  bpm,
  hrv,
  stress,
  risk,
  prediction
}: AIDiagnosisModalProps) {
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [severity, setSeverity] = useState<'low' | 'moderate' | 'high'>('low');

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    setAiAnalysis('');
    setRecommendations([]);

    try {
      // Prepare health data for AI analysis
      const healthData = {
        heartRate: bpm,
        hrv: hrv,
        stressLevel: stress,
        riskLevel: risk,
        aiPrediction: prediction?.result || prediction?.predicted_label || 'N/A',
        confidence: prediction?.confidence ? `${(prediction.confidence * 100).toFixed(1)}%` : 'N/A',
        backendBPM: prediction?.bpm || 'N/A'
      };

      // Create prompt for AI
      const prompt = `As a cardiologist AI assistant, analyze this heart health data and provide a clear summary with recommendations:

Heart Rate: ${healthData.heartRate} BPM
HRV (Heart Rate Variability): ${healthData.hrv} ms
Stress Level: ${healthData.stressLevel}
Risk Assessment: ${healthData.riskLevel}
AI Prediction: ${healthData.aiPrediction}
Confidence: ${healthData.confidence}

Please provide:
1. A brief 2-3 sentence summary of the heart health status
2. 3-5 specific health recommendations
3. Severity level: LOW, MODERATE, or HIGH
4. If HIGH severity, recommend seeing a cardiologist immediately

Format the response as JSON:
{
  "summary": "brief summary here",
  "recommendations": ["rec1", "rec2", "rec3"],
  "severity": "LOW/MODERATE/HIGH",
  "needsDoctor": true/false
}`;

      // Call AI API (using Gemini or similar)
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCRJOCT2ze9y1E78h-aMRi-9zMof3Pa8DQ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse AI response
      try {
        // Extract JSON from response
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          setAiAnalysis(analysis.summary);
          setRecommendations(analysis.recommendations);
          setSeverity(analysis.severity.toLowerCase());
        } else {
          // Fallback if parsing fails
          setAiAnalysis(aiText);
          setRecommendations([
            'Monitor your heart rate regularly',
            'Maintain a healthy lifestyle',
            'Consult with a healthcare provider for personalized advice'
          ]);
          setSeverity(risk === 'high' ? 'high' : risk === 'moderate' ? 'moderate' : 'low');
        }
      } catch {
        setAiAnalysis(aiText);
        setRecommendations(['Consult with a healthcare provider']);
      }

    } catch (error) {
      console.error('AI analysis failed:', error);
      setAiAnalysis('Unable to generate AI analysis at this time. Please consult with a healthcare provider for personalized medical advice.');
      setRecommendations([
        'Schedule an appointment with your doctor',
        'Monitor your symptoms',
        'Maintain a healthy lifestyle'
      ]);
      setSeverity(risk === 'high' ? 'high' : 'moderate');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = () => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'moderate': return '#f59e0b';
      default: return '#22c55e';
    }
  };

  const getSeverityIcon = () => {
    switch (severity) {
      case 'high': return <AlertTriangle size={24} />;
      case 'moderate': return <Activity size={24} />;
      default: return <Heart size={24} />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-2xl md:w-full bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#6dfa7e] rounded-full flex items-center justify-center">
                  <Heart size={20} className="text-[#121826]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">AI Health Analysis</h2>
                  <p className="text-xs text-slate-500">Powered by Advanced AI</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {!isAnalyzing && !aiAnalysis && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-[#6dfa7e]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart size={40} className="text-[#6dfa7e]" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Get AI-Powered Insights</h3>
                  <p className="text-slate-600 mb-6">
                    Our AI will analyze your heart health data and provide personalized recommendations
                  </p>
                  <button
                    onClick={analyzeWithAI}
                    className="bg-[#6dfa7e] hover:bg-[#5ce86d] text-[#121826] px-8 py-3 rounded-full font-bold transition-colors"
                  >
                    Analyze My Results
                  </button>
                </div>
              )}

              {isAnalyzing && (
                <div className="text-center py-12">
                  <Loader2 size={48} className="text-[#6dfa7e] animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Analyzing Your Data...</h3>
                  <p className="text-slate-600">AI is processing your heart health metrics</p>
                </div>
              )}

              {aiAnalysis && !isAnalyzing && (
                <div className="space-y-6">
                  {/* Severity Badge */}
                  <div
                    className="flex items-center gap-3 p-4 rounded-2xl"
                    style={{ backgroundColor: `${getSeverityColor()}15` }}
                  >
                    <div style={{ color: getSeverityColor() }}>
                      {getSeverityIcon()}
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: getSeverityColor() }}>
                        {severity === 'high' ? 'HIGH PRIORITY' : severity === 'moderate' ? 'MODERATE RISK' : 'LOW RISK'}
                      </p>
                      <p className="text-xs text-slate-600">
                        {severity === 'high' 
                          ? 'Immediate medical attention recommended' 
                          : severity === 'moderate'
                          ? 'Monitor closely and consult doctor soon'
                          : 'Continue healthy habits'}
                      </p>
                    </div>
                  </div>

                  {/* AI Summary */}
                  <div className="bg-slate-50 rounded-2xl p-5">
                    <h3 className="font-bold text-slate-800 mb-3">AI Summary</h3>
                    <p className="text-slate-700 leading-relaxed">{aiAnalysis}</p>
                  </div>

                  {/* Recommendations */}
                  {recommendations.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-800 mb-3">Recommendations</h3>
                      <div className="space-y-2">
                        {recommendations.map((rec, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                            <div className="w-6 h-6 bg-[#6dfa7e] rounded-full flex items-center justify-center flex-shrink-0 text-[#121826] font-bold text-xs">
                              {index + 1}
                            </div>
                            <p className="text-slate-700 text-sm">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Doctor Recommendation for High Severity */}
                  {severity === 'high' && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
                      <div className="flex items-start gap-3">
                        <MapPin className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                          <h3 className="font-bold text-red-800 mb-2">See a Doctor Immediately</h3>
                          <p className="text-red-700 text-sm mb-3">
                            Your results indicate potential heart health concerns. Please consult a cardiologist as soon as possible.
                          </p>
                          <button
                            onClick={() => window.open('https://www.google.com/maps/search/cardiologist+near+me', '_blank')}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2"
                          >
                            <MapPin size={14} />
                            Find Nearest Cardiologist
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-amber-800 text-xs">
                      <strong>Disclaimer:</strong> This AI analysis is for informational purposes only and should not replace professional medical advice. Always consult with a qualified healthcare provider for diagnosis and treatment.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
