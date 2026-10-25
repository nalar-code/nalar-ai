'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Send,
  Plus,
  MessageSquare,
  Trash2,
  Cpu,
  Zap,
  Brain,
  Menu,
  X,
} from 'lucide-react';

interface ChatHistory {
  id: string;
  title: string;
  model: string;
}

export default function NalarApp() {
  const [chatList, setChatList] = useState<ChatHistory[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('nalar-kilat');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/chat',
    body: {
      chatId: activeChatId,
      selectedModel,
    },
    onResponse(response) {
      const newChatId = response.headers.get('X-Chat-Id');
      if (newChatId && !activeChatId) {
        setActiveChatId(newChatId);
        fetchChatList();
      }
    },
  });

  const fetchChatList = async () => {
    try {
      const res = await fetch('/api/chats');
      if (res.ok) {
        const data = await res.json();
        setChatList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchChatList();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChat = async (id: string) => {
    setActiveChatId(id);
    const res = await fetch(`/api/chats?id=${id}`);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        setSelectedModel(data.model || 'nalar-kilat');
        setMessages(
          (data.messages || []).map((m: { id: string; role: 'user' | 'assistant'; content: string }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        );
      }
    }
  };

  const startNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/chats?id=${id}`, { method: 'DELETE' });
    if (activeChatId === id) startNewChat();
    fetchChatList();
  };

  return (
    <div className="flex h-screen bg-[#0e1117] text-gray-100 font-sans overflow-hidden">
      {/* SIDEBAR RIWAYAT CHAT */}
      <aside
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } transition-all duration-300 bg-[#161b22] border-r border-gray-800 flex flex-col overflow-hidden`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg">
              N
            </div>
            <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              NALAR AI
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-md"
          >
            <Plus size={18} />
            <span>Percakapan Baru</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase px-2 py-2">Riwayat Nalar</p>
          {chatList.map((chat) => (
            <div
              key={chat.id}
              onClick={() => loadChat(chat.id)}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition ${
                activeChatId === chat.id
                  ? 'bg-gray-800 text-white font-medium'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <MessageSquare size={15} className="shrink-0 text-indigo-400" />
                <span className="truncate">{chat.title}</span>
              </div>
              <button
                onClick={(e) => deleteChat(chat.id, e)}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-800 text-xs text-gray-500 flex items-center justify-between">
          <span>NALAR Cloud v2.0</span>
          <span className="text-emerald-400">● 24/7 Aktif</span>
        </div>
      </aside>

      {/* AREA UTAMA CHAT */}
      <main className="flex-1 flex flex-col h-full">
        <header className="h-16 border-b border-gray-800/80 px-6 flex items-center justify-between bg-[#0e1117]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-800 text-gray-300"
              >
                <Menu size={20} />
              </button>
            )}

            <div className="flex items-center bg-[#161b22] border border-gray-800 rounded-xl p-1 gap-1">
              <button
                onClick={() => setSelectedModel('nalar-kilat')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedModel === 'nalar-kilat'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Zap size={14} /> NALAR Kilat
              </button>
              <button
                onClick={() => setSelectedModel('nalar-pro')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedModel === 'nalar-pro'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sparkles size={14} /> NALAR Pro
              </button>
              <button
                onClick={() => setSelectedModel('nalar-logika')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedModel === 'nalar-logika'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Brain size={14} /> NALAR Logika
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-20 py-8 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center shadow-2xl mb-6">
                <Cpu size={34} className="text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-400 via-cyan-300 to-white bg-clip-text text-transparent mb-3">
                Halo, mari berpikir bersama NALAR.
              </h1>
              <p className="text-gray-400 text-sm md:text-base mb-8">
                Asisten AI cerdas untuk analisis data, pemrograman, penulisan strategis, dan pemecahan masalah kompleks.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full text-left">
                {[
                  'Buatkan arsitektur sistem microservice untuk e-commerce',
                  'Analisis strategi pemasaran produk SaaS di Indonesia',
                  'Bantu saya debug query SQL PostgreSQL yang lambat',
                  'Rangkum konsep ekonomi makro dengan bahasa sederhana',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() =>
                      handleInputChange({ target: { value: prompt } } as React.ChangeEvent<HTMLInputElement>)
                    }
                    className="p-4 rounded-xl bg-[#161b22] border border-gray-800 hover:border-indigo-500/50 text-sm text-gray-300 hover:text-white transition"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-4 max-w-4xl mx-auto ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center shrink-0 font-bold text-xs text-white mt-1">
                    N
                  </div>
                )}
                <div
                  className={`rounded-2xl px-5 py-3.5 max-w-[85%] leading-relaxed text-sm md:text-base ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-[#161b22] border border-gray-800 text-gray-100 rounded-bl-none'
                  }`}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 md:px-20 bg-gradient-to-t from-[#0e1117] via-[#0e1117] to-transparent">
          <form
            onSubmit={handleSubmit}
            className="max-w-4xl mx-auto relative flex items-center bg-[#161b22] border border-gray-700/80 focus-within:border-indigo-500 rounded-2xl p-2 shadow-xl"
          >
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Tanyakan apa saja pada NALAR..."
              className="w-full bg-transparent px-4 py-2.5 text-sm md:text-base text-white placeholder-gray-500 focus:outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition"
            >
              <Send size={18} />
            </button>
          </form>
          <p className="text-center text-[11px] text-gray-500 mt-2">
            NALAR AI Cloud Edition • Berjalan 24 Jam Tanpa Beban PC
          </p>
        </div>
      </main>
    </div>
  );
}
