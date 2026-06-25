'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { type QualificationMessage } from '@/lib/types/intake';
import AiTypingIndicator from './AiTypingIndicator';

const COMPLETION_PHRASE = 'Perfect — I have everything I need';

interface Props {
  messages: QualificationMessage[];
  onAddMessage: (msg: QualificationMessage) => void;
  onQualificationComplete: () => void;
  isAnalyzing: boolean;
}

export default function Step1_QualificationChat({
  messages,
  onAddMessage,
  onQualificationComplete,
  isAnalyzing,
}: Props) {
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [fetchError, setFetchError] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const aiCount = messages.filter(m => m.role === 'assistant').length;
  const questionNumber = Math.min(aiCount + (isStreaming ? 1 : 0), 4);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingText]);

  const fetchAiResponse = useCallback(async (convMessages: QualificationMessage[]) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsStreaming(true);
    setStreamingText('');
    setFetchError(false);

    try {
      const res = await fetch('/api/intake/groq-qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: convMessages,
          step: convMessages.length === 0 ? 'start' : 'continue',
        }),
      });

      if (!res.ok || !res.body) throw new Error('API error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;
          try {
            const parsed = JSON.parse(raw);
            const delta = parsed.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              fullContent += delta;
              setStreamingText(fullContent);
            }
          } catch {}
        }
      }

      if (fullContent) {
        onAddMessage({ role: 'assistant', content: fullContent });
        setStreamingText('');
        if (fullContent.includes(COMPLETION_PHRASE)) {
          setTimeout(() => onQualificationComplete(), 800);
        }
      }
    } catch {
      setFetchError(true);
      setTimeout(() => onQualificationComplete(), 500);
    } finally {
      setIsStreaming(false);
      fetchingRef.current = false;
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [onAddMessage, onQualificationComplete]);

  useEffect(() => {
    if (fetchingRef.current) return;
    const last = messages[messages.length - 1];
    if (messages.length === 0 || (last && last.role === 'user')) {
      fetchAiResponse(messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || trimmed.length < 3 || isStreaming) return;
    setInputValue('');
    onAddMessage({ role: 'user', content: trimmed });
  };

  const lastMsg = messages[messages.length - 1];
  const showInput =
    !isStreaming &&
    !isAnalyzing &&
    messages.length > 0 &&
    lastMsg?.role === 'assistant' &&
    !lastMsg.content.includes(COMPLETION_PHRASE);

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-gray-900">Quick qualification</h2>
          <p className="text-xs text-gray-400">Help us recommend the right services</p>
        </div>
        {questionNumber > 0 && (
          <span className="text-xs text-gray-400 tabular-nums bg-gray-100 px-2.5 py-1 rounded-full">
            Question {questionNumber} of 4
          </span>
        )}
      </div>

      {/* Chat messages */}
      <div className="space-y-3 min-h-[200px] max-h-[340px] overflow-y-auto pr-1 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' ? (
              <div className="flex items-end gap-2 max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-indigo-700 flex items-center justify-center shrink-0 mb-0.5">
                  <span className="text-[8px] text-white font-bold">AI</span>
                </div>
                <div className="px-4 py-3 bg-gray-100 rounded-2xl rounded-tl-sm text-sm text-gray-800 leading-relaxed">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="max-w-[85%] px-4 py-3 bg-violet-600 text-white rounded-2xl rounded-tr-sm text-sm leading-relaxed">
                {msg.content}
              </div>
            )}
          </div>
        ))}

        {/* Streaming response */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="flex items-end gap-2 max-w-[85%]">
              <div className="w-6 h-6 rounded-full bg-indigo-700 flex items-center justify-center shrink-0 mb-0.5">
                <span className="text-[8px] text-white font-bold">AI</span>
              </div>
              {streamingText ? (
                <div className="px-4 py-3 bg-gray-100 rounded-2xl rounded-tl-sm text-sm text-gray-800 leading-relaxed">
                  {streamingText}
                  <span className="inline-block w-0.5 h-3.5 bg-gray-500 ml-0.5 animate-pulse align-middle" />
                </div>
              ) : (
                <AiTypingIndicator />
              )}
            </div>
          </div>
        )}

        {/* Analysing overlay */}
        {isAnalyzing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-700">
              <span className="animate-pulse">✦</span>
              Analysing your answers and finding the best services…
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Your answer…"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 outline-none text-sm transition-colors bg-white"
            />
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || inputValue.trim().length < 3}
              className="px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {fetchError && (
        <p className="text-xs text-center text-amber-600 mt-3">
          AI consultant temporarily unavailable — continuing without recommendations.
        </p>
      )}
    </motion.div>
  );
}
