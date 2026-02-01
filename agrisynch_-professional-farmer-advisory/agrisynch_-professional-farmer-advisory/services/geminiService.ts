
import { GoogleGenAI, Modality, Type } from "@google/genai";

// Creates a fresh AI client right before each request to ensure it uses the latest selected key
const getFreshAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Diagnostic Expert: Uses Gemini 3 Pro with Thinking Mode for complex agricultural reasoning.
 */
export const getDiagnosticAdvice = async (
  cropName: string, 
  stage: string, 
  description: string, 
  imageData?: string
) => {
  const ai = getFreshAIClient();
  try {
    const prompt = `Act as a senior PhD Agricultural Pathologist. A farmer needs a detailed diagnosis.
    Field Context:
    - Crop: ${cropName}
    - Growth Stage: ${stage}
    - Symptoms Reported: ${description}
    
    Instruction:
    1. Identify the most likely disease/pest.
    2. Explain the cause (biological or environmental).
    3. Provide a 3-step immediate intervention (Organic/Chemical/Mechanical).
    4. List 2 long-term soil/management preventions.
    
    Keep language professional yet actionable.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: imageData ? {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageData } },
          { text: prompt }
        ]
      } : prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 } // Maximum reasoning depth for critical diagnostics
      },
    });
    
    return response.text;
  } catch (error) {
    console.error("AI Expert Error:", error);
    return "The Diagnostic Engine encountered an error. Please ensure your device is synchronized and try again.";
  }
};

/**
 * Audio Transcription: Uses Gemini 2.5 Flash Native Audio for accurate voice-to-text conversion.
 */
export const transcribeAudio = async (base64Audio: string) => {
  const ai = getFreshAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      contents: {
        parts: [
          // Updated mimeType to audio/webm to match standard browser MediaRecorder output
          { inlineData: { mimeType: 'audio/webm', data: base64Audio } },
          { text: "Transcribe the following agricultural voice note exactly. If it's in a regional language like Hindi or Marathi, translate it to English." }
        ]
      }
    });
    return response.text;
  } catch (e) {
    console.error("Transcription Failure:", e);
    return null;
  }
};

/**
 * Voice Assistant Intent Parser: Interprets commands to navigate or answer questions.
 */
export const processCommandIntent = async (text: string) => {
  const ai = getFreshAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are the AgriSynch Voice Assistant. Interpret the following user command: "${text}".
      
      Available views: home, crops, diagnostics, library, settings, add, caseLog.
      
      Respond ONLY with a JSON object in this format:
      {
        "action": "NAVIGATE" | "SPEAK" | "QUERY",
        "target": "view_name",
        "message": "confirmation or answer text"
      }
      
      If the user wants to see their crops, navigate to 'crops'.
      If they want to add a field, navigate to 'add'.
      If they want to ask the expert, navigate to 'diagnostics'.
      If they ask a general question about crops or soil, use 'SPEAK' and provide a short, helpful answer.`,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Intent Processing Failure:", e);
    return { action: 'SPEAK', message: "I'm sorry, I couldn't process that command." };
  }
};

/**
 * Text-to-Speech: Uses Gemini 2.5 Flash TTS for accessibility.
 */
export const generateSpeech = async (text: string): Promise<string | undefined> => {
  const ai = getFreshAIClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `AgriSynch Assistant says: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Professional and clear persona
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) {
    console.error("Speech Engine Failure:", e);
    return undefined;
  }
};
