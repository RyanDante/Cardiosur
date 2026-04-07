# AI Diagnosis Modal Setup Guide

## Overview
The AI Diagnosis Modal provides intelligent analysis of heart health data using Google's Gemini AI. It summarizes results, provides personalized recommendations, and recommends seeing a doctor if results are severe.

## Setup Instructions

### 1. Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click on "Get API key" in the left sidebar
4. Click "Create API key"
5. Copy your API key

### 2. Add API Key to the App

Open `src/components/AIDiagnosisModal.tsx` and find this line (around line 84):

```typescript
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY', {
```

Replace `YOUR_API_KEY` with your actual Gemini API key:

```typescript
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=your-actual-api-key-here', {
```

### 3. Alternative: Use Environment Variables (Recommended for Production)

Create a `.env` file in the root directory:

```env
VITE_GEMINI_API_KEY=your-actual-api-key-here
```

Then update the modal to use it:

```typescript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
  {
    // ... rest of the code
  }
);
```

## Features

### 1. AI-Powered Analysis
- Analyzes heart rate, HRV, stress levels, and risk assessment
- Considers AI prediction results and confidence scores
- Provides a clear, easy-to-understand summary

### 2. Severity Assessment
- **LOW**: Continue healthy habits
- **MODERATE**: Monitor closely and consult doctor soon
- **HIGH**: Immediate medical attention recommended

### 3. Personalized Recommendations
- 3-5 specific health recommendations based on your data
- Lifestyle changes
- Monitoring suggestions
- When to see a doctor

### 4. Doctor Finder (For High Severity)
- If results are severe, shows a "Find Nearest Cardiologist" button
- Opens Google Maps search for cardiologists nearby
- Clear recommendation to seek immediate medical attention

## How It Works

1. User clicks "Get Full Results" button on results page
2. Modal opens with health data summary
3. User clicks "Analyze My Results"
4. App sends health data to Gemini AI
5. AI analyzes and returns:
   - Summary of heart health status
   - Severity level (LOW/MODERATE/HIGH)
   - Specific recommendations
   - Whether doctor visit is needed
6. Results displayed in beautiful, easy-to-read format

## Example AI Response

```json
{
  "summary": "Your heart rate of 120 BPM is elevated, and your HRV of 441ms indicates moderate stress levels. The AI prediction suggests abnormal heart sounds with 85% confidence. Immediate medical evaluation is recommended.",
  "recommendations": [
    "Schedule an appointment with a cardiologist within 24-48 hours",
    "Avoid strenuous physical activity until evaluated",
    "Monitor your heart rate regularly and log any symptoms",
    "Reduce stress through deep breathing exercises",
    "Maintain a healthy diet low in sodium and caffeine"
  ],
  "severity": "HIGH",
  "needsDoctor": true
}
```

## Security Notes

⚠️ **Important**: 
- Never commit your API key to version control
- Use environment variables in production
- Consider using a backend proxy to hide the API key
- Monitor API usage to prevent unauthorized access

## Customization

### Change AI Model
Update the model name in the API URL:
- `gemini-2.0-flash` (fast, good for most uses)
- `gemini-2.0-flash-lite` (faster, cheaper)
- `gemini-2.0-pro` (more accurate, slower)

### Adjust Recommendations
Modify the prompt in `analyzeWithAI()` function to get different types of recommendations.

### Styling
The modal uses Tailwind CSS. Customize colors in the component:
- Primary green: `#6dfa7e`
- High severity: `#ef4444` (red)
- Moderate severity: `#f59e0b` (yellow)
- Low severity: `#22c55e` (green)

## Testing

1. Run the app: `npm run dev`
2. Complete a heart recording
3. View results
4. Click "Get Full Results"
5. Click "Analyze My Results"
6. Verify AI analysis appears with recommendations

## Troubleshooting

### "Unable to generate AI analysis"
- Check your API key is correct
- Verify internet connection
- Check browser console for errors
- Ensure API key has Gemini API access enabled

### Modal doesn't open
- Check console for errors
- Verify ResultsPage is passing props correctly
- Make sure AIDiagnosisModal is imported

### AI response doesn't parse
- The modal has fallback handling for parsing errors
- Check the raw AI response in console
- Adjust the prompt if needed

## Support

For issues with Gemini API:
- Visit [Google AI Studio Documentation](https://ai.google.dev/docs)
- Check [Gemini API Reference](https://ai.google.dev/api)

For app-specific issues:
- Check browser console for detailed error messages
- Review network tab for API request/response details
