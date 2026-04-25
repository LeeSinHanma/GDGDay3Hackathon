import { useState, useRef } from 'react';
import type { VerdictData } from '../hooks/useResignChat';
import jsPDF from 'jspdf';

interface VerdictScreenProps {
  verdict: VerdictData;
  onReset: () => void;
}

export function VerdictScreen({ verdict, onReset }: VerdictScreenProps) {
  const { score, redFlags, mode, profLetter, chaoticLetter } = verdict;
  const [activeTab, setActiveTab] = useState<'prof' | 'chaotic'>('prof');
  const [isDownloading, setIsDownloading] = useState(false);
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const letterRef = useRef<HTMLDivElement>(null);

  // Calculates 2 weeks from today
  const lastDay = new Date();
  lastDay.setDate(lastDay.getDate() + 14);
  const formattedLastDay = lastDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const formatLetter = (letter: string) => {
    return letter
      .replace(/\[Your Name\]/gi, userName || '[Your Name]')
      .replace(/\[Company Name\]/gi, companyName || '[Company Name]');
  };

  const currentFormattedLetter = activeTab === 'prof' 
    ? formatLetter(profLetter || "") 
    : formatLetter(chaoticLetter || "");

  const handleDownloadPDF = () => {
    setIsDownloading(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter' // Standard 8.5" x 11"
      });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);

      // Add 1-inch margins (72pt) and wrap text
      const margins = { top: 72, left: 72, width: 468 }; 
      const splitText = pdf.splitTextToSize(currentFormattedLetter, margins.width);
      
      pdf.text(splitText, margins.left, margins.top);
      pdf.save(`Resignation_Letter_${activeTab}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const scoreCommentary = 
    score < 50 ? "Bes... you are stressed, but this is legally not a crime scene yet." :
    score < 75 ? "Grabe ah. Half-crime scene. My blood pressure is rising." :
    "This is NOT petty. This is a CRIME SCENE. Tatawag na ba ako ng NBI?!";

  return (
    <div className="app-container">
      <div className="header-bar">
        <h1 className="header-title">THE VERDICT ⚖️</h1>
        <button className="reset-btn" onClick={onReset}>Venting Done</button>
      </div>

      <div className="verdict-screen">
        <h2 className="verdict-title">{mode === 'RESIGN' ? "🚨 IT. IS. TIME. 🚨" : "STAY (for now) 🫠"}</h2>

        <div className="score-container">
          <div className="score-number">{score}</div>
          <div className="score-label">Pettiness Score</div>
          <div style={{ marginTop: '10px', color: 'var(--text-light)', fontStyle: 'italic' }}>
            "{scoreCommentary}"
          </div>
        </div>

        {verdict.explanation && (
          <div style={{ padding: '0 20px', marginBottom: '20px', fontStyle: 'italic', color: 'var(--text-light)', lineHeight: '1.5' }}>
            "{verdict.explanation}"
          </div>
        )}

        {redFlags.length > 0 && (
          <div className="red-flags">
            <h3 className="section-title">🚩 RED FLAGS DETECTED</h3>
            <ul className="flag-list">
              {redFlags.map((flag, idx) => (
                <li key={idx}>{flag}</li>
              ))}
            </ul>
          </div>
        )}

        {mode === 'STAY' ? (
          <div className="action-plan">
            <h3 className="section-title">Survival Guide</h3>
            <p style={{ marginBottom: '15px', color: 'var(--text-dim)' }}>
              Okay fine... I hate this for you but... here's your survival guide while we plan your grand exit:
            </p>
            <ul className="plan-list">
              <li>Turn off notifications at exactly 5:01 PM. Walang mamamatay.</li>
              <li>Practice saying "Let me check my bandwidth for that" instead of "Yes boss".</li>
              <li>Start applying casually (aka "Quiet Recruiting"). Update that LinkedIn!</li>
            </ul>
            <p style={{ marginTop: '20px', fontStyle: 'italic', fontSize: '0.9rem' }}>
              Want to vent more? I'm here. Walang bayad ang therapy ko. (For now.)
            </p>
          </div>
        ) : (
          <div className="action-plan" style={{ borderColor: 'var(--accent-red)' }}>
            <h3 className="section-title" style={{ color: 'var(--accent-red)' }}>EXIT STRATEGY</h3>
            <p style={{ marginBottom: '15px' }}>
              Bes. BES. I have heard enough. The jury has deliberated. The telenovela has reached its climax. IT. IS. TIME. 🚨🚨🚨
            </p>
            
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <p style={{ marginBottom: '10px' }}><strong>Alibi/Plan: </strong> "Mental health leave into permanent leave pipeline." Go to HR, cry a little, file for SL, and then send the letter below.</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <input
                    type="text"
                    placeholder="Your Name (e.g. Maria)"
                    className="chat-input"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem' }}
                  />
                  <input
                    type="text"
                    placeholder="Company Name (e.g. Toxic Corp)"
                    className="chat-input"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div className="resignation-letters">
                <div className="tabs">
                  <button 
                    className={`tab-btn ${activeTab === 'prof' ? 'active' : ''}`}
                    onClick={() => setActiveTab('prof')}
                  >
                    The Professional Version
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'chaotic' ? 'active' : ''}`}
                    onClick={() => setActiveTab('chaotic')}
                  >
                    The "Unfiltered" Version
                  </button>
                </div>

                <div ref={letterRef} style={{ padding: '20px', borderRadius: '12px', background: 'rgba(0,0,0,0.5)'}}>
                  <div className="letter-content" style={{ color: activeTab === 'chaotic' ? '#ffb3b3' : '#e5e5e5', border: 'none', background: 'transparent', padding: 0 }}>
                    {currentFormattedLetter}
                  </div>
                </div>

              <button 
                onClick={handleDownloadPDF} 
                className="reset-btn" 
                style={{ marginTop: '15px', width: '100%', borderColor: 'var(--accent-red)', color: 'white', background: 'var(--accent-red)', fontWeight: 'bold' }}
                disabled={isDownloading}
              >
                {isDownloading ? "Generating PDF..." : "Download as PDF 📄"}
              </button>
            </div>

            <div style={{ marginTop: '25px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎊🎉🎊</div>
              <strong>Countdown initiated!</strong> Your last day will be <u>{formattedLastDay}</u>. Mark it. Frame it. Celebrate it.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
