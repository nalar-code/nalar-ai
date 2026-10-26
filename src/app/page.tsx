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
  LogOut,
  User as UserIcon,
  Key,
  AlertCircle,
  Lock,
  Mail,
} from 'lucide-react';

interface ChatHistory {
  id: string;
  title: string;
  model: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export default function NalarApp() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [chatList, setChatList] = useState<ChatHistory[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('nalar-kilat');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [chatError, setChatError] = useState<string | null>(null);

  const [showApiModal, setShowApiModal] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('nalar_user');
    const savedKey = localStorage.getItem('nalar_custom_api_key');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }
    if (savedKey) setCustomApiKey(savedKey);
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/chat',
    body: {
      chatId: activeChatId,
      selectedModel,
      userId: user?.id,
      customApiKey: customApiKey || undefined,
    },
    onResponse(response) {
      setChatError(null);
      const newChatId = response.headers.get('X-Chat-Id');
      if (newChatId && !activeChatId) {
        setActiveChatId(newChatId);
        fetchChatList(user?.id);
      }
    },
    onError(err) {
      try {
        const parsed = JSON.parse(err.message);
        setChatError(parsed.error || err.message);
      } catch {
        setChatError(err.message || 'Gagal memproses chat. Periksa API Key OpenAI Anda.');
      }
    },
  });

  const fetchChatList = async (uid?: string) => {
    try {
      const url = uid ? `/api/chats?userId=${uid}` : '/api/chats';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setChatList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchChatList(user.id);
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authMode,
          name: authName,
          email: authEmail,
          password: authPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Terjadi kesalahan saat autentikasi.');
      } else {
        setUser(data.user);
        localStorage.setItem('nalar_user', JSON.stringify(data.user));
      }
    } catch (err) {
      setAuthError('Gagal menghubungi server autentikasi.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nalar_user');
    setUser(null);
    setMessages([]);
    setActiveChatId(null);
    setChatList([]);
  };

  const loadChat = async (id: string) => {
    setActiveChatId(id);
    setChatError(null);
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
    setChatError(null);
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/chats?id=${id}`, { method: 'DELETE' });
    if (activeChatId === id) startNewChat();
    fetchChatList(user?.id);
  };

  const saveCustomKey = () => {
    localStorage.setItem('nalar_custom_api_key', customApiKey.trim());
    setShowApiModal(false);
  };

  // HALAMAN LOGIN & SIGN UP
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0e1117] text-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#161b22] border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center font-bold text-2xl text-white shadow-lg mb-3">
              N
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Selamat Datang di NALAR AI
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Platform Kecerdasan Buatan Generasi Baru
            </p>
          </div>

          <div className="flex bg-[#0e1117] p-1 rounded-xl mb-6 border border-gray-800">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                authMode === 'login' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Masuk (Login)
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('signup'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                authMode === 'signup' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Daftar Akun (Sign Up)
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Nama Lengkap</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3.5 top-3 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Masukkan nama Anda"
                    className="w-full bg-[#0e1117] border border-gray-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Alamat Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3 text-gray-500" />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full bg-[#0e1117] border border-gray-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Kata Sandi</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-gray-500" />
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0e1117] border border-gray-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition shadow-lg mt-2"
            >
              {authLoading
                ? 'Memproses...'
                : authMode === 'login'
                ? 'Masuk ke NALAR'
                : 'Buat Akun NALAR'}
            </button>
          </form>
        </div>
      </div>
    );
  }

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

        {/* PROFIL USER & TOMBOL LOGOUT */}
        <div className="p-3 border-t border-gray-800 space-y-2">
          <button
            onClick={() => setShowApiModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-300 hover:bg-gray-800 transition"
          >
            <Key size={14} className="text-indigo-400" />
            <span>Pengaturan OpenAI API Key</span>
          </button>

          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0e1117] border border-gray-800">
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Keluar (Logout)"
              className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg transition"
            >
              <LogOut size={16} />
            </button>
          </div>
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

          <button
            onClick={() => setShowApiModal(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#161b22] border border-gray-800 hover:border-indigo-500 text-gray-300 transition"
          >
            <Key size={13} className="text-indigo-400" />
            <span>API Key</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-20 py-8 space-y-6">
          {chatError && (
            <div className="max-w-4xl mx-auto p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={18} className="shrink-0 text-red-400" />
                <span>{chatError}</span>
              </div>
              <button
                onClick={() => setShowApiModal(true)}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-medium"
              >
                Atur API Key
              </button>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center shadow-2xl mb-6">
                <Cpu size={34} className="text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-400 via-cyan-300 to-white bg-clip-text text-transparent mb-3">
                Halo {user.name}, mari berpikir bersama NALAR.
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
        </div>
      </main>

      {/* MODAL PENGATURAN OPENAI API KEY */}
      {showApiModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Pengaturan OpenAI API Key</h3>
            <p className="text-xs text-gray-400 mb-4">
              Jika Anda belum mengatur <code className="text-indigo-400">OPENAI_API_KEY</code> di Vercel Environment Variables, Anda bisa memasukkan API Key OpenAI Anda langsung di sini agar chat langsung aktif.
            </p>
            <input
              type="password"
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
              placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-[#0e1117] border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white mb-4 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowApiModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Batal
              </button>
              <button
                onClick={saveCustomKey}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Simpan API Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
