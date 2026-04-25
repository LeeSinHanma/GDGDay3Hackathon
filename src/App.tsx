import { useResignChat } from './hooks/useResignChat';
import { ChatInterface } from './components/ChatInterface';
import { VerdictScreen } from './components/VerdictScreen';

function App() {
  const { messages, phase, verdict, isTyping, handleUserSubmit, resetChat } = useResignChat();

  return (
    <div style={{ padding: '20px', width: '100%', height: '100vh', display: 'flex' }}>
      {phase !== 'VERDICT' || !verdict ? (
        <ChatInterface 
          messages={messages} 
          onSendMessage={handleUserSubmit} 
          isVerdictPhase={phase === 'VERDICT'} 
          isTyping={isTyping}
        />
      ) : (
        <VerdictScreen verdict={verdict} onReset={resetChat} />
      )}
    </div>
  );
}

export default App;