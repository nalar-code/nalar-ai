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
  Menu,
  LogOut,
  User as UserIcon,
  AlertCircle,
  Lock,
  Mail,
  ChevronDown,
  Pin,
  History,
  Settings,
  Compass,
  Code,
  PenTool,
  Lightbulb,
  FileText,
  Mic,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Sun,
  Moon,
  CheckCircle2,
  X,
} from 'lucide-react';

interface ChatHistory {
  id: string;
  title: string;
  model: string;
  isPinned?: boolean;
  updatedAt?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

interface GemPersona {
  id: string;
  name: string;
  desc: string;
  icon: string;
  instruction: string;
  color: string;
}

const DEFAULT_GEMS: GemPersona[] = [
  {
    id: 'default',
    name: 'NALAR Utama',
    desc: 'Asisten serbabisa untuk segala kebutuhan harian, analisis, dan riset.',
    icon: '✨',
    instruction: '',
    color: 'from-blue-500 to-purple-500',
  },
  {
    id: 'coding-partner',
    name: 'Pakar Koding',
    desc: 'Spesialis arsitektur software, debugging kode, SQL, dan pengembangan Full-Stack.',
    icon: '💻',
    instruction: 'Kamu berperan sebagai Senior Principal Software Engineer. Berikan kode yang bersih, efisien, aman, dan jelaskan arsitekturnya secara terstruktur.',
    color: 'from-emerald-500 to-cyan-500',
  },
  {
    id: 'brainstormer',
    name: 'Rekan Ide & Bisnis',
    desc: 'Teman diskusi strategi bisnis, pemasaran, inovasi produk, dan ide kreatif.',
    icon: '💡',
    instruction: 'Kamu berperan sebagai Konsultan Strategi Bisnis & Inovasi. Berikan ide-ide segar, analisis SWOT, dan langkah eksekusi yang praktis.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'editor-tulisan',
    name: 'Editor & Penulis',
    desc: 'Merangkum dokumen, menulis esai, copywriting, dan memperbaiki tata bahasa.',
    icon: '✍️',
    instruction: 'Kamu berperan sebagai Editor Profesional dan Penulis Ahli. Gunakan diksi yang memikat, tata bahasa yang sempurna, dan alur tulisan yang jernih.',
    color: 'from-pink-500 to-rose-500',
  },
];

const MODEL_OPTIONS = [
  {
    id: 'nalar-flash',
    name: 'NALAR 2.0 Flash',
    badge: 'Cepat & Cerdas',
    desc: 'Terbaik untuk tugas sehari-hari dan respons instan',
  },
  {
    id: 'nalar-advanced',
    name: 'NALAR Advanced',
    badge: 'Pro',
    desc: 'Penalaran kompleks, koding tingkat lanjut, dan analisis mendalam',
  },
  {
    id: 'nalar-reasoning',
    name: 'NALAR DeepThink',
    badge: 'Logika R1',
    desc: 'Khusus matematika, algoritma, dan pemecahan masalah berlapis',
  },
  {
    id: 'nalar-free',
    name: 'NALAR Lite',
    badge: 'Ekonomis',
    desc: 'Model ringan Llama 3.3 70B untuk percakapan santai',
  },
];

export default function NalarGeminiApp() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'chat' | 'gems' | 'activity' | 'settings'>('chat');
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [modelMenuOpen, setModelMenuOpen] = useState<boolean>(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState<boolean>(false);

  const [chatList, setChatList] = useState<ChatHistory[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('nalar-flash');
  const [activeGem, setActiveGem] = useState<GemPersona>(DEFAULT_GEMS[0]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentContent, setAttachmentContent] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Bersihkan sisa kunci lokal dari versi lama jika ada
    localStorage.removeItem('nalar_custom_api_key');

    const savedUser = localStorage.getItem('nalar_user');
    const savedTheme = localStorage.getItem('nalar_theme');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }
    if (savedTheme === 'light') setDarkMode(false);
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('nalar_theme', next ? 'dark' : 'light');
  };

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, reload, setInput } = useChat({
    api: '/api/chat',
    body: {
      chatId: activeChatId,
      selectedModel,
      userId: user?.id,
      personaInstruction: activeGem.instruction,
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
        setChatError('Maaf, permintaan belum dapat diproses saat ini. Silakan coba lagi.');
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
    } catch {
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
    setProfileMenuOpen(false);
  };

  const loadChat = async (id: string) => {
    setActiveView('chat');
    setActiveChatId(id);
    setChatError(null);
    const res = await fetch(`/api/chats?id=${id}`);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        setSelectedModel(data.model || 'nalar-flash');
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
    setActiveView('chat');
    setActiveChatId(null);
    setMessages([]);
    setChatError(null);
    setAttachmentName(null);
    setAttachmentContent('');
  };

  const togglePinChat = async (chat: ChatHistory, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch('/api/chats', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: chat.id, isPinned: !chat.isPinned }),
    });
    fetchChatList(user?.id);
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/chats?id=${id}`, { method: 'DELETE' });
    if (activeChatId === id) startNewChat();
    fetchChatList(user?.id);
  };

  const clearAllChats = async () => {
    if (!user) return;
    await fetch(`/api/chats?userId=${user.id}`, { method: 'DELETE' });
    startNewChat();
    fetchChatList(user.id);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setAttachmentContent(content.slice(0, 6000));
    };
    reader.readAsText(file);
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Browser Anda belum mendukung fitur suara langsung. Gunakan Google Chrome atau Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.start();
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() && !attachmentName) return;

    if (attachmentName && attachmentContent) {
      const combined = `[Lampiran File: ${attachmentName}]\n\`\`\`\n${attachmentContent}\n\`\`\`\n\n${input}`;
      setInput(combined);
      setAttachmentName(null);
      setAttachmentContent('');
      setTimeout(() => {
        handleSubmit(e);
      }, 30);
    } else {
      handleSubmit(e);
    }
  };

  const currentModelInfo = MODEL_OPTIONS.find((m) => m.id === selectedModel) || MODEL_OPTIONS[0];
  const pinnedChats = chatList.filter((c) => c.isPinned);
  const recentChats = chatList.filter((c) => !c.isPinned);

  // HALAMAN LOGIN & SIGN UP (Dilengkapi atribut autoComplete standar W3C)
  if (!user) {
    return (
      <div className="min-h-screen bg-[#131314] text-[#e3e3e3] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#1e1f20] border border-[#333537] rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#4285f4] via-[#9b72cb] to-[#d96570] flex items-center justify-center shadow-lg mb-4">
              <Sparkles size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Masuk ke NALAR
            </h1>
            <p className="text-sm text-[#c4c7c5] mt-1">
              Asisten AI pribadi Anda untuk berpikir, berkarya, dan riset
            </p>
          </div>

          <div className="flex bg-[#131314] p-1 rounded-full mb-6 border border-[#333537]">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-medium rounded-full transition ${
                authMode === 'login' ? 'bg-[#333537] text-white' : 'text-[#c4c7c5] hover:text-white'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('signup'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-medium rounded-full transition ${
                authMode === 'signup' ? 'bg-[#333537] text-white' : 'text-[#c4c7c5] hover:text-white'
              }`}
            >
              Buat Akun
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label htmlFor="name-input" className="block text-xs text-[#c4c7c5] mb-1.5 ml-1">Nama Lengkap</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-4 top-3.5 text-[#8e918f]" />
                  <input
                    id="name-input"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Nama Anda"
                    className="w-full bg-[#131314] border border-[#333537] focus:border-[#a8c7fa] rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email-input" className="block text-xs text-[#c4c7c5] mb-1.5 ml-1">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-3.5 text-[#8e918f]" />
                <input
                  id="email-input"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full bg-[#131314] border border-[#333537] focus:border-[#a8c7fa] rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password-input" className="block text-xs text-[#c4c7c5] mb-1.5 ml-1">Kata Sandi</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-3.5 text-[#8e918f]" />
                <input
                  id="password-input"
                  name="password"
                  type="password"
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#131314] border border-[#333537] focus:border-[#a8c7fa] rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-[#a8c7fa] hover:bg-[#8ab4f8] disabled:opacity-50 text-[#062e6f] font-semibold py-3 rounded-full transition shadow-md mt-2 text-sm"
            >
              {authLoading
                ? 'Memproses...'
                : authMode === 'login'
                ? 'Lanjutkan ke NALAR'
                : 'Daftar Sekarang'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-screen font-sans overflow-hidden ${
        darkMode ? 'bg-[#131314] text-[#e3e3e3]' : 'bg-[#f8fafd] text-[#1f1f1f]'
      }`}
    >
      {/* SIDEBAR KIRI IDENTIK DENGAN GOOGLE GEMINI */}
      <aside
        className={`${
          sidebarExpanded ? 'w-72' : 'w-[68px]'
        } transition-all duration-300 flex flex-col justify-between py-3 px-3 shrink-0 select-none ${
          darkMode ? 'bg-[#1e1f20]' : 'bg-[#f0f4f9]'
        }`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1.5">
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className={`p-2.5 rounded-full transition ${
                darkMode ? 'hover:bg-[#333537] text-[#c4c7c5]' : 'hover:bg-[#e1e5ea] text-[#444746]'
              }`}
              title="Buka/Tutup Menu"
            >
              <Menu size={20} />
            </button>
          </div>

          <button
            onClick={startNewChat}
            className={`flex items-center gap-3 rounded-full py-2.5 px-3.5 text-sm font-medium transition ${
              darkMode
                ? 'bg-[#131314] hover:bg-[#282a2c] text-[#e3e3e3] border border-[#333537]'
                : 'bg-[#dde3ea] hover:bg-[#d3dbe5] text-[#1f1f1f]'
            } ${!sidebarExpanded ? 'justify-center px-0 w-11 h-11' : 'w-fit pr-5'}`}
            title="Percakapan Baru"
          >
            <Plus size={19} className="shrink-0 text-[#a8c7fa]" />
            {sidebarExpanded && <span>Chat baru</span>}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto my-4 space-y-5 px-1">
          {sidebarExpanded ? (
            <>
              <div>
                <div className="flex items-center justify-between px-2 mb-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#8e918f]">
                    Gems Nalar
                  </span>
                  <button
                    onClick={() => setActiveView('gems')}
                    className="text-[11px] text-[#a8c7fa] hover:underline"
                  >
                    Jelajahi
                  </button>
                </div>
                <div className="space-y-0.5">
                  {DEFAULT_GEMS.map((gem) => (
                    <button
                      key={gem.id}
                      onClick={() => {
                        setActiveGem(gem);
                        setActiveView('chat');
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-full text-xs transition ${
                        activeGem.id === gem.id && activeView === 'chat'
                          ? darkMode
                            ? 'bg-[#004a77] text-[#c2e7ff] font-medium'
                            : 'bg-[#c2e7ff] text-[#001d35] font-medium'
                          : darkMode
                          ? 'text-[#c4c7c5] hover:bg-[#282a2c]'
                          : 'text-[#444746] hover:bg-[#e1e5ea]'
                      }`}
                    >
                      <span className="text-sm">{gem.icon}</span>
                      <span className="truncate">{gem.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {pinnedChats.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e918f] px-2 mb-1.5">
                    Disematkan
                  </p>
                  <div className="space-y-0.5">
                    {pinnedChats.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => loadChat(chat.id)}
                        className={`group flex items-center justify-between px-3 py-2 rounded-full cursor-pointer text-xs transition ${
                          activeChatId === chat.id
                            ? darkMode
                              ? 'bg-[#004a77] text-[#c2e7ff] font-medium'
                              : 'bg-[#c2e7ff] text-[#001d35] font-medium'
                            : darkMode
                            ? 'text-[#c4c7c5] hover:bg-[#282a2c]'
                            : 'text-[#444746] hover:bg-[#e1e5ea]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Pin size={13} className="shrink-0 text-[#a8c7fa]" />
                          <span className="truncate">{chat.title}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={(e) => togglePinChat(chat, e)}
                            title="Lepas sematan"
                            className="p-1 hover:text-white"
                          >
                            <Pin size={12} />
                          </button>
                          <button
                            onClick={(e) => deleteChat(chat.id, e)}
                            title="Hapus"
                            className="p-1 hover:text-red-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e918f] px-2 mb-1.5">
                  Terkini
                </p>
                {recentChats.length === 0 ? (
                  <p className="text-xs text-[#8e918f] px-3 py-2">Belum ada percakapan</p>
                ) : (
                  <div className="space-y-0.5">
                    {recentChats.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => loadChat(chat.id)}
                        className={`group flex items-center justify-between px-3 py-2 rounded-full cursor-pointer text-xs transition ${
                          activeChatId === chat.id
                            ? darkMode
                              ? 'bg-[#004a77] text-[#c2e7ff] font-medium'
                              : 'bg-[#c2e7ff] text-[#001d35] font-medium'
                            : darkMode
                            ? 'text-[#c4c7c5] hover:bg-[#282a2c]'
                            : 'text-[#444746] hover:bg-[#e1e5ea]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <MessageSquare size={13} className="shrink-0" />
                          <span className="truncate">{chat.title}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={(e) => togglePinChat(chat, e)}
                            title="Sematkan chat"
                            className="p-1 hover:text-[#a8c7fa]"
                          >
                            <Pin size={12} />
                          </button>
                          <button
                            onClick={(e) => deleteChat(chat.id, e)}
                            title="Hapus"
                            className="p-1 hover:text-red-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-3 pt-2">
              <button
                onClick={() => setActiveView('gems')}
                className={`p-2.5 rounded-full transition ${
                  activeView === 'gems' ? 'bg-[#004a77] text-[#c2e7ff]' : 'hover:bg-[#333537] text-[#c4c7c5]'
                }`}
                title="Pengelola Gem"
              >
                <Compass size={19} />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1 pt-2 border-t border-[#333537]/60">
          <button
            onClick={() => setActiveView('gems')}
            className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-full text-xs transition ${
              activeView === 'gems'
                ? 'bg-[#004a77] text-[#c2e7ff] font-medium'
                : darkMode
                ? 'text-[#c4c7c5] hover:bg-[#282a2c]'
                : 'text-[#444746] hover:bg-[#e1e5ea]'
            } ${!sidebarExpanded && 'justify-center px-0'}`}
            title="Pengelola Gem"
          >
            <Compass size={18} className="shrink-0" />
            {sidebarExpanded && <span>Pengelola Gem</span>}
          </button>

          <button
            onClick={() => setActiveView('activity')}
            className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-full text-xs transition ${
              activeView === 'activity'
                ? 'bg-[#004a77] text-[#c2e7ff] font-medium'
                : darkMode
                ? 'text-[#c4c7c5] hover:bg-[#282a2c]'
                : 'text-[#444746] hover:bg-[#e1e5ea]'
            } ${!sidebarExpanded && 'justify-center px-0'}`}
            title="Aktivitas Nalar"
          >
            <History size={18} className="shrink-0" />
            {sidebarExpanded && <span>Aktivitas</span>}
          </button>

          <button
            onClick={() => setActiveView('settings')}
            className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-full text-xs transition ${
              activeView === 'settings'
                ? 'bg-[#004a77] text-[#c2e7ff] font-medium'
                : darkMode
                ? 'text-[#c4c7c5] hover:bg-[#282a2c]'
                : 'text-[#444746] hover:bg-[#e1e5ea]'
            } ${!sidebarExpanded && 'justify-center px-0'}`}
            title="Setelan & Tema"
          >
            <Settings size={18} className="shrink-0" />
            {sidebarExpanded && <span>Setelan & bantuan</span>}
          </button>

          {sidebarExpanded && (
            <div className="px-3 pt-2 flex items-center gap-2 text-[11px] text-[#8e918f]">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Indonesia • NALAR v5.0</span>
            </div>
          )}
        </div>
      </aside>

      {/* AREA UTAMA DASHBOARD NALAR */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="h-16 px-6 flex items-center justify-between shrink-0 z-20">
          <div className="relative">
            <button
              onClick={() => setModelMenuOpen(!modelMenuOpen)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-base font-medium transition ${
                darkMode ? 'hover:bg-[#1e1f20] text-[#e3e3e3]' : 'hover:bg-[#e9eef6] text-[#1f1f1f]'
              }`}
            >
              <span className="font-semibold tracking-tight">NALAR</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-[#4285f4]/20 to-[#d96570]/20 text-[#a8c7fa] border border-[#a8c7fa]/30">
                {currentModelInfo.name.replace('NALAR ', '')}
              </span>
              <ChevronDown size={16} className="text-[#8e918f]" />
            </button>

            {modelMenuOpen && (
              <div
                className={`absolute left-0 mt-2 w-80 rounded-2xl p-2 shadow-2xl border z-50 ${
                  darkMode ? 'bg-[#1e1f20] border-[#333537]' : 'bg-white border-gray-200'
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8e918f] px-3 py-2">
                  Pilih Model NALAR
                </p>
                {MODEL_OPTIONS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id);
                      setModelMenuOpen(false);
                    }}
                    className={`w-full flex items-start justify-between p-3 rounded-xl text-left transition ${
                      selectedModel === m.id
                        ? darkMode
                          ? 'bg-[#282a2c]'
                          : 'bg-[#f0f4f9]'
                        : darkMode
                        ? 'hover:bg-[#282a2c]/60'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{m.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#004a77] text-[#c2e7ff]">
                          {m.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[#8e918f] mt-0.5">{m.desc}</p>
                    </div>
                    {selectedModel === m.id && (
                      <CheckCircle2 size={17} className="text-[#a8c7fa] shrink-0 mt-1" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-full transition ${
                darkMode ? 'hover:bg-[#1e1f20] text-[#c4c7c5]' : 'hover:bg-[#e9eef6] text-[#444746]'
              }`}
              title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
            >
              {darkMode ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2.5 p-1 pr-3 rounded-full bg-[#1e1f20] hover:bg-[#282a2c] border border-[#333537] transition"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4285f4] via-[#9b72cb] to-[#d96570] flex items-center justify-center text-white font-semibold text-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-[#e3e3e3] hidden sm:inline">
                {user.name}
              </span>
            </button>

            {profileMenuOpen && (
              <div
                className={`absolute right-0 top-12 w-64 rounded-3xl p-4 shadow-2xl border z-50 ${
                  darkMode ? 'bg-[#1e1f20] border-[#333537]' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex flex-col items-center text-center pb-4 border-b border-[#333537]">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#4285f4] via-[#9b72cb] to-[#d96570] flex items-center justify-center text-white font-bold text-lg mb-2">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-semibold">Halo, {user.name}!</p>
                  <p className="text-xs text-[#8e918f]">{user.email}</p>
                </div>
                <div className="pt-3 space-y-1">
                  <button
                    onClick={() => {
                      setActiveView('activity');
                      setProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-[#282a2c] transition"
                  >
                    <History size={15} />
                    <span>Kelola Aktivitas Nalar</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition"
                  >
                    <LogOut size={15} />
                    <span>Keluar dari Akun</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {activeView === 'gems' && (
          <div className="flex-1 overflow-y-auto px-6 md:px-20 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold">Pengelola Gem</h2>
                  <p className="text-sm text-[#8e918f] mt-1">
                    Pilih asisten spesialis NALAR yang sudah dikustomisasi untuk kebutuhan spesifik Anda.
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('chat')}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-[#333537] hover:bg-[#444746] text-white"
                >
                  Kembali ke Chat
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DEFAULT_GEMS.map((gem) => (
                  <div
                    key={gem.id}
                    onClick={() => {
                      setActiveGem(gem);
                      startNewChat();
                    }}
                    className={`p-5 rounded-3xl border cursor-pointer transition ${
                      activeGem.id === gem.id
                        ? 'bg-[#1e1f20] border-[#a8c7fa]'
                        : 'bg-[#1e1f20]/70 border-[#333537] hover:border-[#8e918f]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl">{gem.icon}</span>
                      {activeGem.id === gem.id && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#004a77] text-[#c2e7ff]">
                          Sedang Aktif
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold mb-1">{gem.name}</h3>
                    <p className="text-xs text-[#c4c7c5] leading-relaxed">{gem.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'activity' && (
          <div className="flex-1 overflow-y-auto px-6 md:px-20 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold">Aktivitas Aplikasi NALAR</h2>
                  <p className="text-sm text-[#8e918f] mt-1">
                    Kelola semua riwayat percakapan yang tersimpan di akun Anda ({user.email}).
                  </p>
                </div>
                {chatList.length > 0 && (
                  <button
                    onClick={clearAllChats}
                    className="px-4 py-2 rounded-full text-xs font-medium bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30"
                  >
                    Hapus Semua Riwayat
                  </button>
                )}
              </div>

              {chatList.length === 0 ? (
                <div className="p-10 rounded-3xl bg-[#1e1f20] border border-[#333537] text-center text-sm text-[#8e918f]">
                  Belum ada riwayat aktivitas percakapan.
                </div>
              ) : (
                <div className="space-y-2">
                  {chatList.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => loadChat(c.id)}
                      className="flex items-center justify-between p-4 rounded-2xl bg-[#1e1f20] border border-[#333537] hover:border-[#8e918f] cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        <MessageSquare size={17} className="text-[#a8c7fa]" />
                        <div>
                          <p className="text-sm font-medium">{c.title}</p>
                          <p className="text-[11px] text-[#8e918f]">Model: {c.model}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteChat(c.id, e)}
                        className="p-2 text-[#8e918f] hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'settings' && (
          <div className="flex-1 overflow-y-auto px-6 md:px-20 py-8">
            <div className="max-w-3xl mx-auto space-y-6">
              <h2 className="text-2xl font-semibold">Setelan & Bantuan</h2>

              <div className="p-6 rounded-3xl bg-[#1e1f20] border border-[#333537] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Tema Tampilan</p>
                    <p className="text-xs text-[#8e918f]">Sesuaikan tema gelap atau terang ala Gemini</p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="px-4 py-2 rounded-full text-xs font-medium bg-[#333537] text-white"
                  >
                    {darkMode ? 'Mode Gelap Aktif' : 'Mode Terang Aktif'}
                  </button>
                </div>

                <div className="pt-4 border-t border-[#333537] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Keamanan Infrastruktur AI</p>
                    <p className="text-xs text-[#8e918f]">
                      Koneksi API NALAR dienkripsi sepenuhnya di sisi server (Server-Side Protected). Kunci API Anda 100% tersembunyi dari publik.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                    Terlindungi
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 md:px-16 py-6 space-y-6">
              {chatError && (
                <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-3">
                  <AlertCircle size={18} className="shrink-0 text-red-400" />
                  <span>{chatError}</span>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="h-full flex flex-col justify-center max-w-3xl mx-auto py-8">
                  <div className="mb-10">
                    {activeGem.id !== 'default' && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e1f20] border border-[#333537] text-xs text-[#a8c7fa] mb-3">
                        <span>{activeGem.icon}</span>
                        <span>Gem Aktif: {activeGem.name}</span>
                      </div>
                    )}
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
                      <span className="bg-gradient-to-r from-[#4285f4] via-[#9b72cb] to-[#d96570] bg-clip-text text-transparent">
                        Halo, {user.name}
                      </span>
                    </h1>
                    <p className="text-2xl md:text-4xl font-medium text-[#444746] dark:text-[#8e918f] mt-1">
                      Ada yang bisa saya bantu hari ini?
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      {
                        text: 'Rancang arsitektur aplikasi SaaS modern yang siap skala besar',
                        icon: <Code size={18} className="text-[#a8c7fa]" />,
                      },
                      {
                        text: 'Bantu saya menyusun rencana bisnis & pemasaran digital',
                        icon: <Lightbulb size={18} className="text-amber-400" />,
                      },
                      {
                        text: 'Tulis artikel profesional atau esai analitis yang terstruktur',
                        icon: <PenTool size={18} className="text-pink-400" />,
                      },
                      {
                        text: 'Ringkas dokumen panjang & temukan poin-poin kuncinya',
                        icon: <FileText size={18} className="text-emerald-400" />,
                      },
                    ].map((card, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInput(card.text)}
                        className={`flex flex-col justify-between h-40 p-4 rounded-2xl text-left transition border ${
                          darkMode
                            ? 'bg-[#1e1f20] hover:bg-[#282a2c] border-[#333537]/80 text-[#e3e3e3]'
                            : 'bg-[#f0f4f9] hover:bg-[#e1e5ea] border-transparent text-[#1f1f1f]'
                        }`}
                      >
                        <span className="text-xs leading-relaxed">{card.text}</span>
                        <div className="w-9 h-9 rounded-full bg-[#131314]/60 flex items-center justify-center self-end">
                          {card.icon}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-8 pb-6">
                  {messages.map((m) => (
                    <div key={m.id} className="space-y-2">
                      {m.role === 'user' ? (
                        <div className="flex justify-end">
                          <div
                            className={`rounded-3xl rounded-tr-sm px-5 py-3.5 max-w-[85%] text-sm md:text-base leading-relaxed ${
                              darkMode ? 'bg-[#282a2c] text-[#e3e3e3]' : 'bg-[#e9eef6] text-[#1f1f1f]'
                            }`}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-4 items-start">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4285f4] via-[#9b72cb] to-[#d96570] flex items-center justify-center shrink-0 mt-1 shadow-md">
                            <Sparkles size={15} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="prose prose-invert max-w-none text-sm md:text-base leading-relaxed">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                            </div>

                            <div className="flex items-center gap-1 pt-1 text-[#8e918f]">
                              <button
                                onClick={() => handleCopy(m.content, m.id)}
                                className="p-1.5 rounded-full hover:bg-[#282a2c] hover:text-white transition"
                                title="Salin jawaban"
                              >
                                {copiedId === m.id ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                              </button>
                              <button
                                onClick={() => reload()}
                                className="p-1.5 rounded-full hover:bg-[#282a2c] hover:text-white transition"
                                title="Buat ulang respons"
                              >
                                <RotateCcw size={15} />
                              </button>
                              <button
                                className="p-1.5 rounded-full hover:bg-[#282a2c] hover:text-white transition"
                                title="Respons bagus"
                              >
                                <ThumbsUp size={15} />
                              </button>
                              <button
                                className="p-1.5 rounded-full hover:bg-[#282a2c] hover:text-white transition"
                                title="Respons kurang tepat"
                              >
                                <ThumbsDown size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-4 items-center text-sm text-[#8e918f]">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4285f4] via-[#9b72cb] to-[#d96570] flex items-center justify-center animate-pulse">
                        <Sparkles size={15} className="text-white" />
                      </div>
                      <span>NALAR sedang menyusun jawaban...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="px-4 md:px-16 pb-4 pt-2">
              <div className="max-w-3xl mx-auto">
                {attachmentName && (
                  <div className="mb-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1e1f20] border border-[#333537] text-xs text-[#a8c7fa]">
                    <FileText size={14} />
                    <span>{attachmentName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentName(null);
                        setAttachmentContent('');
                      }}
                      className="hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <form
                  onSubmit={onFormSubmit}
                  className={`flex items-center gap-2 rounded-full px-4 py-2.5 border transition shadow-lg ${
                    darkMode
                      ? 'bg-[#1e1f20] border-[#333537] focus-within:bg-[#282a2c] focus-within:border-[#8e918f]'
                      : 'bg-[#f0f4f9] border-gray-300 focus-within:bg-white'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".txt,.md,.csv,.json,.js,.ts,.py,.sql,.html"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full hover:bg-[#333537] text-[#c4c7c5] transition"
                    title="Unggah dokumen atau file teks/kode"
                  >
                    <Plus size={20} />
                  </button>

                  <input
                    name="prompt"
                    autoComplete="off"
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Minta NALAR melakukan apa saja..."
                    className="flex-1 bg-transparent px-2 py-1.5 text-sm md:text-base focus:outline-none placeholder-[#8e918f]"
                    disabled={isLoading}
                  />

                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`p-2 rounded-full transition ${
                      isListening
                        ? 'bg-red-500/20 text-red-400 animate-pulse'
                        : 'hover:bg-[#333537] text-[#c4c7c5]'
                    }`}
                    title="Gunakan mikrofon (Bahasa Indonesia)"
                  >
                    <Mic size={19} />
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading || (!input.trim() && !attachmentName)}
                    className="p-2.5 rounded-full bg-[#a8c7fa] hover:bg-[#8ab4f8] disabled:opacity-30 text-[#062e6f] transition"
                    title="Kirim pesan"
                  >
                    <Send size={17} />
                  </button>
                </form>

                <p className="text-center text-[11px] text-[#8e918f] mt-2.5">
                  NALAR dapat menampilkan info yang kurang akurat, jadi periksa kembali responsnya.
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
