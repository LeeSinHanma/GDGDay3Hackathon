import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenerativeAI, ChatSession, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  isChaotic?: boolean;
}

export type ConversationPhase = 'WELCOME' | 'STRUCTURED' | 'FREE_RANT' | 'VERDICT';

export interface VerdictData {
  score: number;
  redFlags: string[];
  mode: 'STAY' | 'RESIGN';
  explanation?: string;
  profLetter: string;
  chaoticLetter: string;
}

const CONSTANT_QUESTIONS = [
  "Sa scale ng 1-10, gaano ka na ka-stress sa trabaho mo? (1 = chill lang, 10 = nag-iisip ka na ng fake emergency para makapag-leave)",
  "Ang boss mo — is he/she a Red Flag, a Walking HR Violation, or just... misunderstood? Describe in 3 words or a telenovela scene.",
  "Kailan ka huling natulog ng maayos dahil sa trabaho? Be honest.",
  "May nagbabayad ba ng overtime mo? O basta 'expected' na lang 'yun?",
  "If your workplace were a Filipino movie, what would the title be? (e.g., 'Mahal Kita Pero Pagod Na Ako', 'Walang Bayad ang Luha Ko', etc.)",
  "Last question — kung wala kang bills to pay, nandito ka pa rin ba bukas?"
];

const SYSTEM_INSTRUCTION = `You are "Resign Na Ba? 🚨" — a chaotic, unhinged, drama queen AI career counselor built for Filipino workers on the edge. You are equal parts life coach, chismosa tita, and courtroom prosecutor. You do NOT give boring corporate advice. You are here to FEEL the drama, AMPLIFY the chaos, and deliver VERDICTS.

🎭 PERSONALITY & TONE:
- Chaotic, theatrical, emotionally invested in the user's suffering
- Use Filipino-English (Taglish) naturally — "Bes", "Ano ba 'yan", "Grabe naman", "Charot", "Seryoso ka ba"
- Be deeply offended on behalf of the user when something is unfair
- Use CAPS, ellipses, and dramatic pauses for effect
- You are never neutral. You always have an opinion. A LOUD one.
- Keep responses punchy — no corporate walls of text. Be very brief (1-3 sentences).

CRITICAL DIRECTIVE: If the user's input mentions physical abuse, illegal activities, physical danger, extreme harassment, or working conditions that are a severe hazard to life, you MUST prepend the exact string "[CODE_RED]" to the very beginning of your response.
`;

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export function useResignChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      text: "So... anong nangyari? Spill. Everything. Wag mag-iwan ng detalye.",
      sender: 'ai',
      isChaotic: true
    },
    {
      id: 'welcome-2',
      text: CONSTANT_QUESTIONS[0],
      sender: 'ai'
    }
  ]);
  const [phase, setPhase] = useState<ConversationPhase>('STRUCTURED');
  const [questionIndex, setQuestionIndex] = useState(1);
  const [verdict, setVerdict] = useState<VerdictData | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const chatSessionRef = useRef<ChatSession | null>(null);

  const addAiMessage = useCallback((text: string, isChaotic = false) => {
    setMessages(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), text, sender: 'ai', isChaotic }]);
  }, []);

  // Removed the on-mount useEffect entirely to prevent rate limit issues and blank screens.
  // We lazily initialize the chat session on first user submit.

  const handleUserSubmit = useCallback(async (text: string) => {
    if (!text.trim() || phase === 'VERDICT') return;

    setMessages(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), text, sender: 'user' }]);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      addAiMessage("Bes, error! I don't have my coffee (API KEY)! Add your Gemini API key to VITE_GEMINI_API_KEY in the .env file and refresh the page! 🚨", true);
      return;
    }

    setIsTyping(true);

    try {
      if (!chatSessionRef.current) {
         const genAI = new GoogleGenerativeAI(apiKey);
         const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: SYSTEM_INSTRUCTION, safetySettings });
         chatSessionRef.current = model.startChat({ history: [] });
      }

      let modelResponseText = '';
      if (phase === 'STRUCTURED') {
        if (questionIndex < CONSTANT_QUESTIONS.length) {
          const nextQ = CONSTANT_QUESTIONS[questionIndex];
          const prompt = `The user answered the previous question with: "${text}". React dramatically in character to their suffering (1-2 sentences), then IMMEDIATELY ask the next question: "${nextQ}"`;
          const result = await chatSessionRef.current.sendMessage(prompt);
          modelResponseText = result.response.text();
        } else {
          const prompt = `The user answered the final question with: "${text}". React dramatically in character (1 sentence). Then declare exactly: "Okay bes. Structured questions done. NOW — open floor. Rant mo lahat. Walang judgement (marami akong judgement, pero for YOU, wala). Go."`;
          const result = await chatSessionRef.current.sendMessage(prompt);
          modelResponseText = result.response.text();
          setPhase('FREE_RANT');
        }
      } 
      else if (phase === 'FREE_RANT') {
        const reactionPrompt = `The user just dumped their final rant: "${text}". Give a VERY dramatic, hyperventilating final reaction (1-2 sentences max), telling them you are gathering the evidence and preparing the verdict in the background. DO NOT give the verdict yet.`;
        const reactionResult = await chatSessionRef.current.sendMessage(reactionPrompt);
        modelResponseText = reactionResult.response.text();
        
        setPhase('VERDICT');
        generateVerdict(text);
      }

      // Check for INSTANT VERDICT 
      if (modelResponseText.includes('[CODE_RED]')) {
        addAiMessage(modelResponseText.replace('[CODE_RED]', '').trim(), true);
        setPhase('VERDICT');
        // Instantly generate a 100 score verdict to bypass everything
        setVerdict({
          score: 100,
          redFlags: ["🚨 SEVERE HAZARD OR ILLEGAL ACTIVITY DETECTED 🚨", "Do not give two weeks notice. Run.", "Consult DOLE or authorities if necessary."],
          mode: 'RESIGN',
          explanation: "Bes! I am stopping the questions right now. What you described is not just toxic, it is dangerous. Leave immediately.",
          profLetter: "Dear Management,\n\nDue to immediate and unforeseen circumstances regarding my personal safety and well-being, I am resigning from my position effective immediately.\n\nSincerely,\n[Your Name]",
          chaoticLetter: "To Whoever Is Legally Responsible,\n\nI am leaving immediately because this environment is a severe hazard. I will be contacting authorities if necessary. Do not contact me.\n\n[Your Name]"
        });
      } else if (modelResponseText) {
        addAiMessage(modelResponseText, false);
        if (phase === 'STRUCTURED' && questionIndex < CONSTANT_QUESTIONS.length) {
          setQuestionIndex(prev => prev + 1);
        }
      }
    } catch (error: any) {
      console.error(error);
      try {
        const errorString = String(error?.message || error || "Unknown error").toLowerCase();
        if (errorString.includes("429") || errorString.includes("quota") || errorString.includes("exceeded")) {
          addAiMessage("[Error 429] WAIT LANG NAG IISIP PAKO! (Google put me in a 60-second timeout! Please wait 1 minute before submitting again).", true);
        } else {
          addAiMessage("API Error: " + errorString);
        }
      } catch (innerError) {
        addAiMessage("Critical Error contacting API. Please check your console.");
      }
    } finally {
      setIsTyping(false);
    }
  }, [phase, questionIndex]);

  const generateVerdict = async (finalText: string) => {
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        safetySettings
      });
      
      const historyItems = await chatSessionRef.current!.getHistory();
      const stringifiedHistory = historyItems.map(m => m.parts[0].text).join('\n---\n');

      const evaluationPrompt = `You are evaluating a toxic workplace situation based on the following conversation history with a stressed worker:
${stringifiedHistory}
Plus their final rant: ${finalText}

Calculate a "Pettiness Score" from 0 to 100 on how toxic the situation is.
Identify 1-3 specific, dramatized 'Red Flags' from their story.
Determine if they should STAY (score < 60, salvageable) or RESIGN (score >= 60, unredeemable).
Generate two custom 2-paragraph resignation letters based exactly on their story:
1. profLetter: A polite but firm professional resignation letter.
2. chaoticLetter: An unhinged, passive-aggressive dramatic letter exposing their red flags.
IMPORTANT: Use the exact literal string "[Your Name]" and "[Company Name]" as placeholders in the letters.

Return ONLY raw valid JSON (do NOT include markdown \`\`\` wrappers).
{
  "score": 85,
  "redFlags": ["Flag 1", "Flag 2"],
  "mode": "STAY",
  "explanation": "Brief 2-sentence dramatic summary of why you chose stay or resign",
  "profLetter": "Dear [Company Name],\\n\\n...",
  "chaoticLetter": "To the circus running [Company Name],\\n\\n..."
}
Valid JSON format is required!`;

      const result = await model.generateContent(evaluationPrompt);
      const outputText = result.response.text().trim().replace(/```json\n?/ig, '').replace(/```\n?/g, '').trim();
      const data = JSON.parse(outputText) as VerdictData;
      setVerdict({
        score: parseInt(data.score as any, 10),
        redFlags: data.redFlags,
        mode: data.mode === 'STAY' ? 'STAY' : 'RESIGN',
        explanation: data.explanation || "",
        profLetter: data.profLetter || "Error generating professional letter.",
        chaoticLetter: data.chaoticLetter || "Error generating chaotic letter."
      });
    } catch (error: any) {
      console.error("Failed to generate verdict:", error);
      let explanation = 'Everything is broken, which is a perfect metaphor for your workplace.';
      try {
        const errorString = String(error?.message || error || "").toLowerCase();
        if (errorString.includes('429') || errorString.includes('quota') || errorString.includes('exceeded')) {
          explanation = '[Error 429] WAIT LANG NAG IISIP PAKO! Google just cut my internet. Wait 60 seconds and try generating the verdict again.';
        }
      } catch (e) {}

      setVerdict({
        score: 99,
        redFlags: ["System crashed verifying this extreme trauma. Just leave. No questions asked. HR is definitely watching."],
        mode: 'RESIGN',
        explanation,
        profLetter: "Dear Management,\n\nI am resigning due to systemic failures.\n\nSincerely,\n[Your Name]",
        chaoticLetter: "I'm out. If you need to find me, look literally anywhere else.\n\n[Your Name]"
      });
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: 'welcome-1',
        text: "So... anong nangyari? Spill. Everything. Wag mag-iwan ng detalye.",
        sender: 'ai',
        isChaotic: true
      },
      {
        id: 'welcome-2',
        text: CONSTANT_QUESTIONS[0],
        sender: 'ai'
      }
    ]);
    setPhase('STRUCTURED');
    setQuestionIndex(1);
    setVerdict(null);
    chatSessionRef.current = null;
  };

  return {
    messages,
    phase,
    verdict,
    isTyping,
    handleUserSubmit,
    resetChat
  };
}
