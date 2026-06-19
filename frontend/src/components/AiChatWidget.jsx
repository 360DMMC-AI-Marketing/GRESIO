import { useState, useRef, useEffect } from 'react';

export default function AiChatWidget({ projectId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (open && projectId && messages.length === 0) {
      fetch(`/api/ai/chat/${projectId}/history`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
      })
        .then(r => r.json())
        .then(d => { if (d.messages) setMessages(d.messages); })
        .catch(() => {});
    }
  }, [open, projectId]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/chat/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'No response' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to AI service.' }]);
    } finally { setLoading(false); }
  };

  return (
    <>
      <button onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 w-12 h-12 bg-[#2347e8] text-white rounded-full shadow-lg hover:bg-[#1d3dcc] transition-colors flex items-center justify-center z-50 cursor-pointer border-none">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 w-[360px] h-[500px] bg-white rounded-2xl shadow-2xl border border-surface-200 flex flex-col z-50 overflow-hidden">
          <div className="px-4 py-3 bg-[#2347e8] text-white text-sm font-semibold flex items-center justify-between shrink-0">
            <span>AI Project Assistant</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white cursor-pointer bg-transparent border-none">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
            {messages.length === 0 && !loading && (
              <div className="text-center text-surface-400 py-8">Ask anything about this project</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#2347e8] text-white'
                    : 'bg-surface-100 text-surface-800'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-100 rounded-lg px-3 py-2 text-surface-500">
                  <span className="animate-pulse">Thinking</span>...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-surface-100 shrink-0">
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Ask about tasks, deadlines, risks..."
                className="flex-1 text-xs border border-surface-200 rounded-lg px-3 py-2 outline-none focus:border-[#2347e8]"
              />
              <button onClick={send} disabled={loading || !input.trim()}
                className="px-3 py-2 bg-[#2347e8] text-white rounded-lg text-xs font-semibold hover:bg-[#1d3dcc] disabled:opacity-50 transition-colors cursor-pointer border-none">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
