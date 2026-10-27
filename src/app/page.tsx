'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowUp,
  Plus,
  MessageSquare,
  Trash2,
  PanelLeft,
  LogOut,
  User as UserIcon,
  AlertCircle,
  Lock,
  Mail,
  ChevronDown,
  Pin,
  History,
  Settings,
  Layers,
  FileSpreadsheet,
  PenLine,
  FileText,
  Mic,
  Copy,
  Check,
  RotateCcw,
  Sun,
  Moon,
  Search,
  Paperclip,
  X,
  ShieldCheck,
  Terminal,
  Briefcase,
  Building2,
  BadgeCheck,
  KeyRound,
  Download,
  CheckCircle2,
  Users,
  Activity,
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
  role?: string;
  plan?: string;
  dailyQuota?: number;
  jobTitle?: string;
  organization?: string;
  bio?: string;
  avatarColor?: string;
  createdAt?: string;
}

interface WorkspaceModule {
  id: string;
  name: string;
  role: string;
  desc: string;
  instruction: string;
}

const WORKSPACE_MODULES: WorkspaceModule[] = [
  {
    id: 'general',
    name: 'General Assistant',
    role: 'Core Workspace',
    desc: 'Riset harian, sintesis dokumen, dan pemecahan masalah operasional.',
    instruction: '',
  },
  {
    id: 'engineering',
    name: 'Software Architecture',
    role: 'Engineering',
    desc: 'Review kode produksi, desain sistem, optimasi SQL, dan dokumentasi teknis.',
    instruction:
      'Kamu bertindak sebagai Principal Software Architect. Tulis kode produksi yang modular, type-safe, aman, dan jelaskan trade-off teknis secara ringkas.',
  },
  {
    id: 'strategy',
    name: 'Business & Strategy',
    role: 'Executive',
    desc: 'Analisis pasar, penyusunan proposal B2B, metrik finansial SaaS, dan GTM.',
    instruction:
      'Kamu bertindak sebagai VP of Strategy & Operations. Gunakan kerangka kerja bisnis yang terukur, objektif, dan berorientasi pada eksekusi.',
  },
  {
    id: 'editorial',
    name: 'Technical & Copy Editor',
    role: 'Communications',
    desc: 'Penyuntingan laporan eksekutif, dokumentasi produk, dan komunikasi korporat.',
    instruction:
      'Kamu bertindak sebagai Managing Editor. Pastikan setiap tulisan memiliki struktur logis, nada profesional, dan tata bahasa yang presisi.',
  },
];

const MODEL_OPTIONS = [
  {
    id: 'nalar-flash',
    name: 'Nalar 2.0 Flash',
    tier: 'Standard',
    desc: 'Latensi rendah untuk operasional harian',
  },
  {
    id: 'nalar-advanced',
    name: 'Nalar Pro',
    tier: 'Enterprise',
    desc: 'Kapasitas analitik penuh & pemrosesan kode kompleks',
  },
  {
    id: 'nalar-reasoning',
    name: 'Nalar R1 Reasoning',
    tier: 'Deep Logic',
    desc: 'Verifikasi algoritma, logika formal, dan matematika',
  },
  {
    id: 'nalar-free',
    name: 'Nalar Lite',
    tier: 'Economy',
    desc: 'Model efisien Llama 3.3 70B untuk draf cepat',
  },
];

const AVATAR_COLORS: Record<string, string> = {
  zinc: 'bg-zinc-800 text-zinc-100',
  emerald: 'bg-emerald-600 text-white',
  blue: 'bg-blue-600 text-white',
  amber: 'bg-amber-600 text-white',
  rose: 'bg-rose-600 text-white',
};

export default function NalarSaaSWorkspace() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authJobTitle, setAuthJobTitle] = useState('');
  const [authOrg, setAuthOrg] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'chat' | 'profile' | 'modules' | 'logs' | 'admin' | 'settings'>('chat');
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [modelMenuOpen, setModelMenuOpen] = useState<boolean>(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // State Halaman Profil Pengguna & Keamanan
  const [profName, setProfName] = useState('');
  const [profJob, setProfJob] = useState('');
  const [profOrg, setProfOrg] = useState('');
  const [profBio, setProfBio] = useState('');
  const [profColor, setProfColor] = useState('zinc');
  const [profStatus, setProfStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [profSaving, setProfSaving] = useState(false);

  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passStatus, setPassStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [passSaving, setPassSaving] = useState(false);

  // State Admin Console
  const [adminStats, setAdminStats] = useState<{
    totalUsers: number;
    totalChats: number;
    totalMessages: number;
    apiConfigured: boolean;
  } | null>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);

  const [chatList, setChatList] = useState<ChatHistory[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('nalar-flash');
  const [activeModule, setActiveModule] = useState<WorkspaceModule>(WORKSPACE_MODULES[0]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentContent, setAttachmentContent] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncProfileForm = (u: UserProfile) => {
    setProfName(u.name || '');
    setProfJob(u.jobTitle || 'Professional');
    setProfOrg(u.organization || 'Personal Workspace');
    setProfBio(u.bio || '');
    setProfColor(u.avatarColor || 'zinc');
  };

  useEffect(() => {
    localStorage.removeItem('nalar_custom_api_key');
    const savedTheme = localStorage.getItem('nalar_theme');
    if (savedTheme === 'light') {
      setDarkMode(false);
    } else {
      setDarkMode(true);
    }

    fetch('/api/auth')
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          syncProfileForm(data.user);
          localStorage.setItem('nalar_user', JSON.stringify(data.user));
        } else {
          const savedUser = localStorage.getItem('nalar_user');
          if (savedUser) {
            try {
              const parsed = JSON.parse(savedUser);
              setUser(parsed);
              syncProfileForm(parsed);
            } catch {
              localStorage.removeItem('nalar_user');
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('nalar_theme', next ? 'dark' : 'light');
  };

  const userContextPrompt = user
    ? `Nama Pengguna: ${user.name} | Jabatan/Peran: ${user.jobTitle || 'Professional'} | Organisasi: ${user.organization || 'Workspace'} ${user.bio ? `| Fokus & Preferensi Kerja: ${user.bio}` : ''}`
    : '';

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, reload, setInput } = useChat({
    api: '/api/chat',
    body: {
      chatId: activeChatId,
      selectedModel,
      userId: user?.id,
      personaInstruction: activeModule.instruction,
      userContext: userContextPrompt,
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
        setChatError(err.message || 'Permintaan gagal. Periksa apakah OPENROUTER_API_KEY sudah terpasang di Vercel.');
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

  const fetchAdminData = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/admin?requesterId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setAdminStats(data.stats);
        setAdminUsers(data.users || []);
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
    if (activeView === 'admin' && user) {
      fetchAdminData();
    }
  }, [activeView, user]);

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
          jobTitle: authJobTitle,
          organization: authOrg,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Autentikasi gagal.');
      } else {
        setUser(data.user);
        syncProfileForm(data.user);
        localStorage.setItem('nalar_user', JSON.stringify(data.user));
      }
    } catch {
      setAuthError('Gagal menghubungi layanan autentikasi.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    localStorage.removeItem('nalar_user');
    setUser(null);
    setMessages([]);
    setActiveChatId(null);
    setChatList([]);
    setProfileMenuOpen(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfSaving(true);
    setProfStatus(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: profName,
          jobTitle: profJob,
          organization: profOrg,
          bio: profBio,
          avatarColor: profColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfStatus({ type: 'error', msg: data.error || 'Gagal menyimpan profil.' });
      } else {
        setUser(data.user);
        localStorage.setItem('nalar_user', JSON.stringify(data.user));
        setProfStatus({ type: 'success', msg: 'Profil dan konteks personalisasi AI berhasil diperbarui.' });
      }
    } catch {
      setProfStatus({ type: 'error', msg: 'Terjadi kesalahan jaringan.' });
    } finally {
      setProfSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPassSaving(true);
    setPassStatus(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          userId: user.id,
          currentPassword: currPass,
          newPassword: newPass,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPassStatus({ type: 'error', msg: data.error || 'Gagal mengubah kata sandi.' });
      } else {
        setCurrPass('');
        setNewPass('');
        setPassStatus({ type: 'success', msg: data.message || 'Kata sandi berhasil diperbarui.' });
      }
    } catch {
      setPassStatus({ type: 'error', msg: 'Gagal menghubungi server.' });
    } finally {
      setPassSaving(false);
    }
  };

  const handleToggleUserPlan = async (targetUser: any) => {
    const nextPlan = targetUser.plan === 'pro' ? 'free' : 'pro';
    const nextQuota = nextPlan === 'pro' ? 9999 : 30;
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId: targetUser.id,
        plan: nextPlan,
        dailyQuota: nextQuota,
      }),
    });
    fetchAdminData();
  };

  const handleExportData = () => {
    if (!user) return;
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      profile: user,
      totalThreads: chatList.length,
      threads: chatList,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nalar-data-${user.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmed = window.confirm(
      'PERINGATAN: Menghapus akun akan menghapus seluruh riwayat diskusi dan profil Anda secara permanen dari database PostgreSQL. Lanjutkan?'
    );
    if (!confirmed) return;

    await fetch(`/api/profile?userId=${user.id}`, { method: 'DELETE' });
    localStorage.removeItem('nalar_user');
    setUser(null);
  };

  const loadChat = async (id: string) => {
    setActiveView('chat');
    setActiveChatId(id);
    setChatError(null);
    const res = await fetch(`/api/chats?id=${id}&userId=${user?.id || ''}`);
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
      body: JSON.stringify({ chatId: chat.id, isPinned: !chat.isPinned, userId: user?.id }),
    });
    fetchChatList(user?.id);
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/chats?id=${id}&userId=${user?.id || ''}`, { method: 'DELETE' });
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
      setAttachmentContent(content.slice(0, 8000));
    };
    reader.readAsText(file);
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Gunakan browser berbasis Chromium (Chrome/Edge) untuk dikte suara.');
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
      const combined = `[Dokumen: ${attachmentName}]\n\`\`\`\n${attachmentContent}\n\`\`\`\n\n${input}`;
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
  const filteredChats = chatList.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pinnedChats = filteredChats.filter((c) => c.isPinned);
  const recentChats = filteredChats.filter((c) => !c.isPinned);
  const avatarBadgeClass = AVATAR_COLORS[user?.avatarColor || 'zinc'] || AVATAR_COLORS.zinc;

  if (!user) {
    return (
      <div
        className={`min-h-screen flex flex-col justify-center items-center px-4 font-sans transition-colors ${
          darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
        }`}
      >
        <div className="w-full max-w-[420px]">
          <div className="flex flex-col items-center text-center mb-7">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg mb-4 shadow-sm border ${
                darkMode
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
                  : 'bg-zinc-900 border-zinc-900 text-white'
              }`}
            >
              N
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              {authMode === 'login' ? 'Masuk ke Nalar Workspace' : 'Registrasi Profil Nalar'}
            </h1>
            <p className={`text-xs mt-1.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Dilindungi enkripsi PBKDF2-SHA512 & isolasi data tingkat baris
            </p>
          </div>

          <div
            className={`rounded-xl border p-6 shadow-sm ${
              darkMode ? 'bg-zinc-900/60 border-zinc-800/80' : 'bg-white border-zinc-200/90'
            }`}
          >
            <div
              className={`grid grid-cols-2 p-1 rounded-lg mb-5 border text-xs font-medium ${
                darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200/70'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                }}
                className={`py-1.5 rounded-md transition ${
                  authMode === 'login'
                    ? darkMode
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'bg-white text-zinc-900 shadow-sm'
                    : darkMode
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError('');
                }}
                className={`py-1.5 rounded-md transition ${
                  authMode === 'signup'
                    ? darkMode
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'bg-white text-zinc-900 shadow-sm'
                    : darkMode
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Daftar Akun
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === 'signup' && (
                <>
                  <div>
                    <label
                      htmlFor="name-input"
                      className={`block text-xs font-medium mb-1.5 ${
                        darkMode ? 'text-zinc-300' : 'text-zinc-700'
                      }`}
                    >
                      Nama Lengkap
                    </label>
                    <div className="relative">
                      <UserIcon
                        size={15}
                        className={`absolute left-3 top-2.5 ${
                          darkMode ? 'text-zinc-500' : 'text-zinc-400'
                        }`}
                      />
                      <input
                        id="name-input"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Nama Lengkap Anda"
                        className={`w-full rounded-lg pl-9 pr-3 py-2 text-sm border focus:outline-none transition ${
                          darkMode
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-600 placeholder-zinc-600'
                            : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-900 placeholder-zinc-400'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="job-input"
                        className={`block text-xs font-medium mb-1.5 ${
                          darkMode ? 'text-zinc-300' : 'text-zinc-700'
                        }`}
                      >
                        Peran / Jabatan
                      </label>
                      <input
                        id="job-input"
                        type="text"
                        value={authJobTitle}
                        onChange={(e) => setAuthJobTitle(e.target.value)}
                        placeholder="Software Engineer"
                        className={`w-full rounded-lg px-3 py-2 text-xs border focus:outline-none transition ${
                          darkMode
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-600 placeholder-zinc-600'
                            : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-900 placeholder-zinc-400'
                        }`}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="org-input"
                        className={`block text-xs font-medium mb-1.5 ${
                          darkMode ? 'text-zinc-300' : 'text-zinc-700'
                        }`}
                      >
                        Organisasi / Tim
                      </label>
                      <input
                        id="org-input"
                        type="text"
                        value={authOrg}
                        onChange={(e) => setAuthOrg(e.target.value)}
                        placeholder="Nama Perusahaan"
                        className={`w-full rounded-lg px-3 py-2 text-xs border focus:outline-none transition ${
                          darkMode
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-600 placeholder-zinc-600'
                            : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-900 placeholder-zinc-400'
                        }`}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="email-input"
                  className={`block text-xs font-medium mb-1.5 ${
                    darkMode ? 'text-zinc-300' : 'text-zinc-700'
                  }`}
                >
                  Email Kerja / Pribadi
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    className={`absolute left-3 top-2.5 ${
                      darkMode ? 'text-zinc-500' : 'text-zinc-400'
                    }`}
                  />
                  <input
                    id="email-input"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="nama@perusahaan.com"
                    className={`w-full rounded-lg pl-9 pr-3 py-2 text-sm border focus:outline-none transition ${
                      darkMode
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-600 placeholder-zinc-600'
                        : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-900 placeholder-zinc-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password-input"
                  className={`block text-xs font-medium mb-1.5 ${
                    darkMode ? 'text-zinc-300' : 'text-zinc-700'
                  }`}
                >
                  Kata Sandi (Min. 6 Karakter)
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    className={`absolute left-3 top-2.5 ${
                      darkMode ? 'text-zinc-500' : 'text-zinc-400'
                    }`}
                  />
                  <input
                    id="password-input"
                    name="password"
                    type="password"
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full rounded-lg pl-9 pr-3 py-2 text-sm border focus:outline-none transition ${
                      darkMode
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-600 placeholder-zinc-600'
                        : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-900 placeholder-zinc-400'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className={`w-full font-medium py-2.5 rounded-lg text-xs transition mt-2 ${
                  darkMode
                    ? 'bg-zinc-100 hover:bg-white text-zinc-950 disabled:opacity-50'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-50'
                }`}
              >
                {authLoading
                  ? 'Memverifikasi Kredensial...'
                  : authMode === 'login'
                  ? 'Masuk ke Workspace'
                  : 'Buat Profil & Masuk'}
              </button>
            </form>
          </div>

          <div className="mt-6 flex items-center justify-between text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>HttpOnly Session & TLS Encrypted</span>
            </span>
            <button onClick={toggleTheme} className="hover:underline flex items-center gap-1.5">
              {darkMode ? <Sun size={13} /> : <Moon size={13} />}
              <span>{darkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-screen font-sans overflow-hidden transition-colors ${
        darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'
      }`}
    >
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0 border-r-0'
        } transition-all duration-200 flex flex-col justify-between shrink-0 overflow-hidden select-none border-r ${
          darkMode ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-zinc-50/90 border-zinc-200/80'
        }`}
      >
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between px-1.5 py-1">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${
                  darkMode ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-white'
                }`}
              >
                N
              </div>
              <span className="font-semibold text-sm tracking-tight">NALAR</span>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border uppercase ${
                  user.plan === 'pro'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                    : darkMode
                    ? 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
                    : 'bg-zinc-200/70 border-zinc-300 text-zinc-700'
                }`}
              >
                {user.plan === 'pro' ? 'PRO' : 'STARTER'}
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className={`p-1.5 rounded-md transition ${
                darkMode
                  ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  : 'text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900'
              }`}
              title="Sembunyikan Sidebar"
            >
              <PanelLeft size={16} />
            </button>
          </div>

          <button
            onClick={startNewChat}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border transition shadow-sm ${
              darkMode
                ? 'bg-zinc-900 hover:bg-zinc-800/90 border-zinc-800 text-zinc-100'
                : 'bg-white hover:bg-zinc-100/80 border-zinc-200/90 text-zinc-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Plus size={15} />
              <span>Thread Baru</span>
            </span>
            <kbd
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
              }`}
            >
              ⌘K
            </kbd>
          </button>

          <div className="relative">
            <Search
              size={13}
              className={`absolute left-2.5 top-2.5 ${
                darkMode ? 'text-zinc-500' : 'text-zinc-400'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari riwayat diskusi..."
              className={`w-full pl-8 pr-3 py-1.5 rounded-md text-xs border focus:outline-none transition ${
                darkMode
                  ? 'bg-zinc-950/60 border-zinc-800/80 text-zinc-200 placeholder-zinc-500 focus:border-zinc-700'
                  : 'bg-white border-zinc-200/90 text-zinc-800 placeholder-zinc-400 focus:border-zinc-400'
              }`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-5 my-1">
          <div>
            <div className="flex items-center justify-between px-1.5 mb-1.5">
              <span
                className={`text-[11px] font-medium ${
                  darkMode ? 'text-zinc-500' : 'text-zinc-400'
                }`}
              >
                Modul Kerja
              </span>
              <button
                onClick={() => setActiveView('modules')}
                className={`text-[11px] hover:underline ${
                  darkMode ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                Semua
              </button>
            </div>
            <div className="space-y-0.5">
              {WORKSPACE_MODULES.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => {
                    setActiveModule(mod);
                    setActiveView('chat');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition ${
                    activeModule.id === mod.id && activeView === 'chat'
                      ? darkMode
                        ? 'bg-zinc-800/90 text-zinc-100 font-medium'
                        : 'bg-zinc-200/80 text-zinc-900 font-medium'
                      : darkMode
                      ? 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                      : 'text-zinc-600 hover:bg-zinc-200/40 hover:text-zinc-900'
                  }`}
                >
                  <span className="truncate">{mod.name}</span>
                  <span
                    className={`text-[10px] ${
                      darkMode ? 'text-zinc-500' : 'text-zinc-400'
                    }`}
                  >
                    {mod.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {pinnedChats.length > 0 && (
            <div>
              <p
                className={`text-[11px] font-medium px-1.5 mb-1.5 ${
                  darkMode ? 'text-zinc-500' : 'text-zinc-400'
                }`}
              >
                Disematkan
              </p>
              <div className="space-y-0.5">
                {pinnedChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => loadChat(chat.id)}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer text-xs transition ${
                      activeChatId === chat.id
                        ? darkMode
                          ? 'bg-zinc-800 text-zinc-100 font-medium'
                          : 'bg-zinc-200/80 text-zinc-900 font-medium'
                        : darkMode
                        ? 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                        : 'text-zinc-600 hover:bg-zinc-200/40 hover:text-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Pin size={12} className="shrink-0 opacity-70" />
                      <span className="truncate">{chat.title}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => togglePinChat(chat, e)}
                        className="p-0.5 hover:opacity-80"
                        title="Lepas sematan"
                      >
                        <Pin size={11} />
                      </button>
                      <button
                        onClick={(e) => deleteChat(chat.id, e)}
                        className="p-0.5 hover:text-red-500"
                        title="Hapus"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p
              className={`text-[11px] font-medium px-1.5 mb-1.5 ${
                darkMode ? 'text-zinc-500' : 'text-zinc-400'
              }`}
            >
              Riwayat Diskusi
            </p>
            {recentChats.length === 0 ? (
              <p className={`text-xs px-2 py-1.5 ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Belum ada thread aktif
              </p>
            ) : (
              <div className="space-y-0.5">
                {recentChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => loadChat(chat.id)}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer text-xs transition ${
                      activeChatId === chat.id
                        ? darkMode
                          ? 'bg-zinc-800 text-zinc-100 font-medium'
                          : 'bg-zinc-200/80 text-zinc-900 font-medium'
                        : darkMode
                        ? 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                        : 'text-zinc-600 hover:bg-zinc-200/40 hover:text-zinc-900'
                    }`}
                  >
                    <span className="truncate pr-2">{chat.title}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                      <button
                        onClick={(e) => togglePinChat(chat, e)}
                        className="p-0.5 hover:opacity-80"
                        title="Sematkan"
                      >
                        <Pin size={11} />
                      </button>
                      <button
                        onClick={(e) => deleteChat(chat.id, e)}
                        className="p-0.5 hover:text-red-500"
                        title="Hapus"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          className={`p-3 border-t space-y-1 ${
            darkMode ? 'border-zinc-800/80' : 'border-zinc-200/80'
          }`}
        >
          <button
            onClick={() => setActiveView('profile')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition ${
              activeView === 'profile'
                ? darkMode
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'bg-zinc-200/80 text-zinc-900 font-medium'
                : darkMode
                ? 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                : 'text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900'
            }`}
          >
            <UserIcon size={15} />
            <span>Profil & Keamanan Akun</span>
          </button>

          <button
            onClick={() => setActiveView('admin')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition ${
              activeView === 'admin'
                ? darkMode
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'bg-zinc-200/80 text-zinc-900 font-medium'
                : darkMode
                ? 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                : 'text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900'
            }`}
          >
            <Users size={15} />
            <span>Konsol Admin & Kuota</span>
          </button>

          <button
            onClick={() => setActiveView('modules')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition ${
              activeView === 'modules'
                ? darkMode
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'bg-zinc-200/80 text-zinc-900 font-medium'
                : darkMode
                ? 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                : 'text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900'
            }`}
          >
            <Layers size={15} />
            <span>Direktori Modul</span>
          </button>

          <button
            onClick={() => setActiveView('logs')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition ${
              activeView === 'logs'
                ? darkMode
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'bg-zinc-200/80 text-zinc-900 font-medium'
                : darkMode
                ? 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                : 'text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900'
            }`}
          >
            <History size={15} />
            <span>Log Aktivitas</span>
          </button>

          <div
            onClick={() => setActiveView('profile')}
            className={`mt-2 pt-2 border-t flex items-center justify-between px-1.5 py-1 rounded-lg cursor-pointer transition ${
              darkMode
                ? 'border-zinc-800/60 hover:bg-zinc-800/40'
                : 'border-zinc-200/70 hover:bg-zinc-200/50'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarBadgeClass}`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-medium truncate">{user.name}</p>
                <p className={`text-[10px] truncate ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  {user.jobTitle || 'Professional'} • {user.organization || 'Workspace'}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              title="Keluar"
              className={`p-1.5 rounded-md transition ${
                darkMode
                  ? 'text-zinc-400 hover:bg-zinc-800 hover:text-red-400'
                  : 'text-zinc-500 hover:bg-zinc-200 hover:text-red-600'
              }`}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header
          className={`h-13 py-2.5 px-5 border-b flex items-center justify-between shrink-0 z-20 ${
            darkMode ? 'bg-zinc-950/80 border-zinc-800/80' : 'bg-white/80 border-zinc-200/80'
          } backdrop-blur-md`}
        >
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className={`p-1.5 rounded-md border transition ${
                  darkMode
                    ? 'border-zinc-800 hover:bg-zinc-900 text-zinc-300'
                    : 'border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                }`}
                title="Tampilkan Sidebar"
              >
                <PanelLeft size={16} />
              </button>
            )}

            <div className="flex items-center gap-2 text-xs">
              <span className={darkMode ? 'text-zinc-400' : 'text-zinc-500'}>
                {activeModule.name}
              </span>
              <span className={darkMode ? 'text-zinc-700' : 'text-zinc-300'}>/</span>

              <div className="relative">
                <button
                  onClick={() => setModelMenuOpen(!modelMenuOpen)}
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-md border font-medium transition ${
                    darkMode
                      ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-100'
                      : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-900'
                  }`}
                >
                  <span>{currentModelInfo.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded ${
                      darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200/80 text-zinc-600'
                    }`}
                  >
                    {currentModelInfo.tier}
                  </span>
                  <ChevronDown size={13} className="opacity-60" />
                </button>

                {modelMenuOpen && (
                  <div
                    className={`absolute left-0 mt-1.5 w-72 rounded-xl p-1.5 shadow-xl border z-50 ${
                      darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                    }`}
                  >
                    <div
                      className={`text-[10px] font-medium px-2.5 py-1.5 ${
                        darkMode ? 'text-zinc-500' : 'text-zinc-400'
                      }`}
                    >
                      Pilih Engine Pemrosesan
                    </div>
                    {MODEL_OPTIONS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m.id);
                          setModelMenuOpen(false);
                        }}
                        className={`w-full flex items-start justify-between p-2.5 rounded-lg text-left transition ${
                          selectedModel === m.id
                            ? darkMode
                              ? 'bg-zinc-800/90 text-zinc-100'
                              : 'bg-zinc-100 text-zinc-900'
                            : darkMode
                            ? 'hover:bg-zinc-800/40 text-zinc-300'
                            : 'hover:bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{m.name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded border ${
                                darkMode
                                  ? 'bg-zinc-950 border-zinc-700 text-zinc-400'
                                  : 'bg-white border-zinc-200 text-zinc-600'
                              }`}
                            >
                              {m.tier}
                            </span>
                          </div>
                          <p
                            className={`text-[11px] mt-0.5 ${
                              darkMode ? 'text-zinc-500' : 'text-zinc-500'
                            }`}
                          >
                            {m.desc}
                          </p>
                        </div>
                        {selectedModel === m.id && (
                          <Check size={14} className="shrink-0 mt-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 relative">
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition ${
                darkMode
                  ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                  : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700'
              }`}
              title="Ubah Tema Warna"
            >
              {darkMode ? <Sun size={13} /> : <Moon size={13} />}
              <span className="hidden sm:inline">{darkMode ? 'Light' : 'Dark'}</span>
            </button>

            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border text-xs transition ${
                darkMode
                  ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-200'
                  : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-800'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${avatarBadgeClass}`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium hidden sm:inline max-w-[110px] truncate">
                {user.name}
              </span>
              <ChevronDown size={12} className="opacity-60" />
            </button>

            {profileMenuOpen && (
              <div
                className={`absolute right-0 top-11 w-64 rounded-xl p-2 shadow-xl border z-50 ${
                  darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                }`}
              >
                <div
                  className={`px-3 py-2.5 border-b mb-1 ${
                    darkMode ? 'border-zinc-800' : 'border-zinc-100'
                  }`}
                >
                  <p className="text-xs font-semibold truncate">{user.name}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-500 font-medium">
                    <BadgeCheck size={12} />
                    <span>{user.jobTitle || 'Professional'} • {user.organization || 'Workspace'}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveView('profile');
                    setProfileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition ${
                    darkMode ? 'hover:bg-zinc-800 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
                  }`}
                >
                  <UserIcon size={14} />
                  <span>Profil & Keamanan Akun</span>
                </button>

                <button
                  onClick={() => {
                    setActiveView('admin');
                    setProfileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition ${
                    darkMode ? 'hover:bg-zinc-800 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
                  }`}
                >
                  <Users size={14} />
                  <span>Konsol Admin & Kuota</span>
                </button>

                <button
                  onClick={() => {
                    setActiveView('logs');
                    setProfileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition ${
                    darkMode ? 'hover:bg-zinc-800 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
                  }`}
                >
                  <History size={14} />
                  <span>Log Aktivitas ({chatList.length})</span>
                </button>

                <div className={`my-1 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`} />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-500 hover:bg-red-500/10 transition"
                >
                  <LogOut size={14} />
                  <span>Keluar dari Sesi</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* VIEW 1: PROFIL PENGGUNA & KEAMANAN */}
        {activeView === 'profile' && (
          <div className="flex-1 overflow-y-auto px-6 md:px-16 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-500/15">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Profil Pengguna & Keamanan Data</h2>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Kelola identitas profesional, konteks personalisasi AI, kata sandi, dan privasi data Anda.
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('chat')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    darkMode
                      ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-200'
                      : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-800'
                  }`}
                >
                  Kembali ke Workspace
                </button>
              </div>

              <div
                className={`p-5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  darkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50/70 border-zinc-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-sm ${avatarBadgeClass}`}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">{user.name}</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <ShieldCheck size={11} /> Terverifikasi
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {user.jobTitle || 'Professional'} di {user.organization || 'Personal Workspace'}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportData}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      darkMode
                        ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-200'
                        : 'bg-white border-zinc-300 hover:bg-zinc-50 text-zinc-800'
                    }`}
                  >
                    <Download size={13} />
                    <span>Ekspor Data (JSON)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <form
                  onSubmit={handleSaveProfile}
                  className={`md:col-span-2 p-5 rounded-xl border space-y-4 ${
                    darkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'
                  }`}
                >
                  <div className="border-b pb-3 border-zinc-500/15">
                    <h4 className="text-sm font-semibold">Identitas & Personalisasi NALAR</h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Informasi ini otomatis diselaraskan agar NALAR memberikan jawaban yang relevan dengan profesi Anda.
                    </p>
                  </div>

                  {profStatus && (
                    <div
                      className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                        profStatus.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                          : 'bg-red-500/10 border-red-500/20 text-red-500'
                      }`}
                    >
                      <CheckCircle2 size={14} className="shrink-0" />
                      <span>{profStatus.msg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium mb-1">Nama Lengkap</label>
                      <input
                        type="text"
                        required
                        value={profName}
                        onChange={(e) => setProfName(e.target.value)}
                        className={`w-full rounded-lg px-3 py-2 text-xs border focus:outline-none ${
                          darkMode
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-600'
                            : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Alamat Email (Terkunci)</label>
                      <input
                        type="email"
                        disabled
                        value={user.email}
                        className={`w-full rounded-lg px-3 py-2 text-xs border opacity-60 cursor-not-allowed ${
                          darkMode
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-400'
                            : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium mb-1">Jabatan / Peran Spesialis</label>
                      <div className="relative">
                        <Briefcase size={13} className="absolute left-3 top-2.5 text-zinc-500" />
                        <input
                          type="text"
                          value={profJob}
                          onChange={(e) => setProfJob(e.target.value)}
                          placeholder="Contoh: Backend Engineer / CEO"
                          className={`w-full rounded-lg pl-8 pr-3 py-2 text-xs border focus:outline-none ${
                            darkMode
                              ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-600'
                              : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-900'
                          }`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Organisasi / Perusahaan</label>
                      <div className="relative">
                        <Building2 size={13} className="absolute left-3 top-2.5 text-zinc-500" />
                        <input
                          type="text"
                          value={profOrg}
                          onChange={(e) => setProfOrg(e.target.value)}
                          placeholder="Contoh: PT Nalar Teknologi"
                          className={`w-full rounded-lg pl-8 pr-3 py-2 text-xs border focus:outline-none ${
                            darkMode
                              ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-600'
                              : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-900'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Instruksi Personalisasi AI (Bio & Preferensi Jawaban)
                    </label>
                    <textarea
                      rows={3}
                      value={profBio}
                      onChange={(e) => setProfBio(e.target.value)}
                      placeholder="Contoh: Saya menggunakan TypeScript, Next.js, dan PostgreSQL. Berikan jawaban yang ringkas, langsung ke kode, dan gunakan Bahasa Indonesia formal."
                      className={`w-full rounded-lg p-3 text-xs border focus:outline-none ${
                        darkMode
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-600 placeholder-zinc-600'
                          : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-900 placeholder-zinc-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5">Warna Identitas Avatar</label>
                    <div className="flex items-center gap-2">
                      {Object.keys(AVATAR_COLORS).map((colorKey) => (
                        <button
                          key={colorKey}
                          type="button"
                          onClick={() => setProfColor(colorKey)}
                          className={`px-3 py-1 rounded-md text-xs capitalize border transition ${
                            profColor === colorKey
                              ? darkMode
                                ? 'border-white bg-zinc-800 font-semibold'
                                : 'border-zinc-900 bg-zinc-100 font-semibold'
                              : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          {colorKey}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={profSaving}
                      className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
                        darkMode
                          ? 'bg-zinc-100 hover:bg-white text-zinc-950'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                      }`}
                    >
                      {profSaving ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
                    </button>
                  </div>
                </form>

                <div className="space-y-6">
                  <form
                    onSubmit={handleChangePassword}
                    className={`p-5 rounded-xl border space-y-3.5 ${
                      darkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 border-b pb-2.5 border-zinc-500/15">
                      <KeyRound size={15} />
                      <h4 className="text-sm font-semibold">Ubah Kata Sandi</h4>
                    </div>

                    {passStatus && (
                      <div
                        className={`p-2.5 rounded-lg text-[11px] border ${
                          passStatus.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                            : 'bg-red-500/10 border-red-500/20 text-red-500'
                        }`}
                      >
                        {passStatus.msg}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium mb-1">Kata Sandi Saat Ini</label>
                      <input
                        type="password"
                        required
                        autoComplete="current-password"
                        value={currPass}
                        onChange={(e) => setCurrPass(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full rounded-lg px-3 py-2 text-xs border focus:outline-none ${
                          darkMode
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
                            : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">Kata Sandi Baru</label>
                      <input
                        type="password"
                        required
                        autoComplete="new-password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="Min. 6 karakter"
                        className={`w-full rounded-lg px-3 py-2 text-xs border focus:outline-none ${
                          darkMode
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
                            : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={passSaving}
                      className={`w-full py-2 rounded-lg text-xs font-medium border transition ${
                        darkMode
                          ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-100'
                          : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-900'
                      }`}
                    >
                      {passSaving ? 'Memperbarui...' : 'Perbarui Kata Sandi'}
                    </button>
                  </form>

                  <div
                    className={`p-5 rounded-xl border space-y-3 ${
                      darkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'
                    }`}
                  >
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Standar Keamanan Aktif
                    </h4>
                    <ul className="space-y-2 text-xs">
                      <li className="flex items-start gap-2">
                        <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          <strong>PBKDF2-SHA512:</strong> 10.000 iterasi kriptografi dengan salt unik per pengguna.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          <strong>HttpOnly Signed Cookie:</strong> Sesi login tahan terhadap serangan XSS.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          <strong>Row-Level Isolation:</strong> Riwayat diskusi terisolasi penuh per ID pengguna.
                        </span>
                      </li>
                    </ul>

                    <div className="pt-3 border-t border-zinc-500/15">
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        className="w-full py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 border border-red-500/20 transition"
                      >
                        Hapus Akun & Seluruh Data
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: KONSOL ADMIN & MANAJEMEN KUOTA PENGGUNA */}
        {activeView === 'admin' && (
          <div className="flex-1 overflow-y-auto px-6 md:px-16 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-500/15">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Konsol Admin & Manajemen Pengguna</h2>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Pantau metrik sistem secara real-time dan kelola kuota atau paket langganan pengguna.
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('chat')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    darkMode
                      ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-200'
                      : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-800'
                  }`}
                >
                  Kembali ke Workspace
                </button>
              </div>

              {/* Kartu Metrik Sistem */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div
                  className={`p-4 rounded-xl border ${
                    darkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'
                  }`}
                >
                  <p className="text-[11px] text-zinc-500">Total Pengguna</p>
                  <p className="text-2xl font-bold mt-1">{adminStats?.totalUsers ?? '-'}</p>
                </div>
                <div
                  className={`p-4 rounded-xl border ${
                    darkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'
                  }`}
                >
                  <p className="text-[11px] text-zinc-500">Total Sesi Thread</p>
                  <p className="text-2xl font-bold mt-1">{adminStats?.totalChats ?? '-'}</p>
                </div>
                <div
                  className={`p-4 rounded-xl border ${
                    darkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'
                  }`}
                >
                  <p className="text-[11px] text-zinc-500">Total Pesan Diproses</p>
                  <p className="text-2xl font-bold mt-1">{adminStats?.totalMessages ?? '-'}</p>
                </div>
                <div
                  className={`p-4 rounded-xl border ${
                    darkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'
                  }`}
                >
                  <p className="text-[11px] text-zinc-500">Status OpenRouter API</p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
                    {adminStats?.apiConfigured ? (
                      <span className="text-emerald-500 flex items-center gap-1">
                        <Activity size={14} /> Terhubung
                      </span>
                    ) : (
                      <span className="text-amber-500 flex items-center gap-1">
                        <AlertCircle size={14} /> Belum Disetel
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabel Daftar Pengguna */}
              <div
                className={`rounded-xl border overflow-hidden ${
                  darkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'
                }`}
              >
                <div className="px-4 py-3 border-b border-zinc-500/15 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Direktori Pengguna Terdaftar
                  </h3>
                  <button
                    onClick={fetchAdminData}
                    className="text-xs text-emerald-500 hover:underline"
                  >
                    Segarkan Data
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr
                        className={`border-b ${
                          darkMode
                            ? 'border-zinc-800 bg-zinc-950/50 text-zinc-400'
                            : 'border-zinc-200 bg-zinc-50 text-zinc-500'
                        }`}
                      >
                        <th className="py-2.5 px-4">Nama & Email</th>
                        <th className="py-2.5 px-4">Organisasi</th>
                        <th className="py-2.5 px-4">Paket</th>
                        <th className="py-2.5 px-4">Thread</th>
                        <th className="py-2.5 px-4 text-right">Aksi Kuota</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-500/10">
                      {adminUsers.map((u) => (
                        <tr key={u.id}>
                          <td className="py-3 px-4">
                            <p className="font-medium">{u.name}</p>
                            <p className="text-[11px] text-zinc-500">{u.email}</p>
                          </td>
                          <td className="py-3 px-4 text-zinc-400">
                            {u.jobTitle} • {u.organization}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                                u.plan === 'pro'
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                                  : 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400'
                              }`}
                            >
                              {u.plan} ({u.dailyQuota}/hari)
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono">{u.chatCount}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleToggleUserPlan(u)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition ${
                                darkMode
                                  ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                                  : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800'
                              }`}
                            >
                              {u.plan === 'pro' ? 'Ubah ke Free' : 'Upgrade ke PRO'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: MODULES DIRECTORY */}
        {activeView === 'modules' && (
          <div className="flex-1 overflow-y-auto px-6 md:px-16 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-500/15">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Direktori Modul Spesialis</h2>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Konfigurasi konteks sistem untuk departemen dan fungsi kerja spesifik.
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('chat')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    darkMode
                      ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-200'
                      : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-800'
                  }`}
                >
                  Kembali ke Editor
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {WORKSPACE_MODULES.map((mod) => (
                  <div
                    key={mod.id}
                    onClick={() => {
                      setActiveModule(mod);
                      startNewChat();
                    }}
                    className={`p-5 rounded-xl border cursor-pointer transition ${
                      activeModule.id === mod.id
                        ? darkMode
                          ? 'bg-zinc-900 border-zinc-600'
                          : 'bg-zinc-50/80 border-zinc-900'
                        : darkMode
                        ? 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
                        : 'bg-white border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${
                          darkMode
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-400'
                            : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                        }`}
                      >
                        {mod.role}
                      </span>
                      {activeModule.id === mod.id && (
                        <span className="text-[11px] font-medium text-emerald-500 flex items-center gap-1">
                          ● Aktif
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold mt-2 mb-1">{mod.name}</h3>
                    <p className={`text-xs leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {mod.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: ACTIVITY LOGS */}
        {activeView === 'logs' && (
          <div className="flex-1 overflow-y-auto px-6 md:px-16 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-500/15">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Log Aktivitas & Arsip Thread</h2>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Seluruh sesi diskusi pribadi yang terenkripsi untuk akun {user.email}.
                  </p>
                </div>
                {chatList.length > 0 && (
                  <button
                    onClick={clearAllChats}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
                  >
                    Bersihkan Semua Log
                  </button>
                )}
              </div>

              {chatList.length === 0 ? (
                <div
                  className={`p-10 rounded-xl border text-center text-xs ${
                    darkMode
                      ? 'bg-zinc-900/30 border-zinc-800 text-zinc-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-500'
                  }`}
                >
                  Tidak ada riwayat percakapan yang tercatat.
                </div>
              ) : (
                <div
                  className={`rounded-xl border divide-y overflow-hidden ${
                    darkMode
                      ? 'bg-zinc-900/40 border-zinc-800 divide-zinc-800/70'
                      : 'bg-white border-zinc-200 divide-zinc-200/70'
                  }`}
                >
                  {chatList.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => loadChat(c.id)}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition text-xs ${
                        darkMode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <MessageSquare size={14} className="opacity-50 shrink-0" />
                        <span className="font-medium truncate">{c.title}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded border ${
                            darkMode
                              ? 'bg-zinc-950 border-zinc-800 text-zinc-400'
                              : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                          }`}
                        >
                          {c.model}
                        </span>
                        <button
                          onClick={(e) => deleteChat(c.id, e)}
                          className="text-zinc-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 5: MAIN CHAT WORKSPACE */}
        {activeView === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 md:px-12 py-6">
              {chatError && (
                <div className="max-w-3xl mx-auto mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2.5">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{chatError}</span>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="h-full flex flex-col justify-center max-w-3xl mx-auto py-6">
                  <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-medium mb-3 border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      <span>● Sesi Terenkripsi</span>
                      <span>•</span>
                      <span>Modul: {activeModule.name}</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                      Selamat bekerja, {user.name}.
                    </h1>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {user.jobTitle ? `Konteks aktif: ${user.jobTitle} (${user.organization}). ` : ''}
                      Pilih templat kerja di bawah atau ketik instruksi langsung.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        title: 'Arsitektur & Review Kode',
                        desc: 'Evaluasi struktur microservice, skema SQL PostgreSQL, dan optimasi API',
                        prompt: 'Buatkan rancangan arsitektur backend yang scalable beserta skema tabel PostgreSQL untuk sistem transaksi B2B.',
                        icon: <Terminal size={16} />,
                      },
                      {
                        title: 'Strategi Produk & GTM',
                        desc: 'Susun metrik KPI, model harga SaaS, dan rencana ekspansi pasar',
                        prompt: 'Susun kerangka strategi Go-To-Market (GTM) dan struktur pricing tier untuk produk B2B SaaS di Indonesia.',
                        icon: <Briefcase size={16} />,
                      },
                      {
                        title: 'Analisis Data & Laporan',
                        desc: 'Ekstrak insight utama, tren kuartalan, dan ringkasan eksekutif',
                        prompt: 'Bantu saya menyusun template Executive Summary untuk laporan performa kuartalan perusahaan.',
                        icon: <FileSpreadsheet size={16} />,
                      },
                      {
                        title: 'Dokumentasi & Spesifikasi',
                        desc: 'Tulis PRD (Product Requirements Document) atau SOP standar',
                        prompt: 'Buatkan dokumen PRD (Product Requirements Document) lengkap dengan user stories dan acceptance criteria.',
                        icon: <PenLine size={16} />,
                      },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInput(item.prompt)}
                        className={`group p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                          darkMode
                            ? 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/90 hover:border-zinc-700'
                            : 'bg-white hover:bg-zinc-50/80 border-zinc-200/90 hover:border-zinc-300 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className="text-xs font-semibold">{item.title}</span>
                          <span
                            className={`p-1.5 rounded-md border ${
                              darkMode
                                ? 'bg-zinc-950 border-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                                : 'bg-zinc-50 border-zinc-200 text-zinc-600 group-hover:text-zinc-900'
                            }`}
                          >
                            {item.icon}
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {item.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-6 pb-6">
                  {messages.map((m) => (
                    <div key={m.id} className="space-y-1.5">
                      {m.role === 'user' ? (
                        <div className="flex justify-end">
                          <div
                            className={`rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] text-sm leading-relaxed border ${
                              darkMode
                                ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
                                : 'bg-zinc-100 border-zinc-200/80 text-zinc-900'
                            }`}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3.5 items-start">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-1 text-[11px] font-bold ${
                              darkMode ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-white'
                            }`}
                          >
                            N
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div
                              className={`prose max-w-none text-sm leading-relaxed ${
                                darkMode ? 'prose-invert text-zinc-200' : 'text-zinc-800'
                              }`}
                            >
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                            </div>

                            <div className="flex items-center gap-1 pt-1">
                              <button
                                onClick={() => handleCopy(m.content, m.id)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] transition ${
                                  darkMode
                                    ? 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
                                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'
                                }`}
                                title="Salin teks"
                              >
                                {copiedId === m.id ? (
                                  <>
                                    <Check size={12} className="text-emerald-500" />
                                    <span className="text-emerald-500">Tersalin</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} />
                                    <span>Salin</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => reload()}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] transition ${
                                  darkMode
                                    ? 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
                                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'
                                }`}
                                title="Regenerasi respons"
                              >
                                <RotateCcw size={12} />
                                <span>Ulangi</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3.5 items-center text-xs text-zinc-500">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[11px] animate-pulse ${
                          darkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-700'
                        }`}
                      >
                        N
                      </div>
                      <span>Memproses respons...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="px-4 md:px-12 pb-4 pt-2">
              <div className="max-w-3xl mx-auto">
                {attachmentName && (
                  <div
                    className={`mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-md border text-xs ${
                      darkMode
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                    }`}
                  >
                    <FileText size={13} />
                    <span>{attachmentName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentName(null);
                        setAttachmentContent('');
                      }}
                      className="hover:opacity-75"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                <form
                  onSubmit={onFormSubmit}
                  className={`rounded-xl border transition shadow-sm ${
                    darkMode
                      ? 'bg-zinc-900/90 border-zinc-800 focus-within:border-zinc-700'
                      : 'bg-white border-zinc-300/90 focus-within:border-zinc-400'
                  }`}
                >
                  <div className="px-3.5 pt-2.5 pb-1.5">
                    <input
                      name="prompt"
                      autoComplete="off"
                      value={input}
                      onChange={handleInputChange}
                      placeholder={`Kirim instruksi ke ${currentModelInfo.name}...`}
                      className={`w-full bg-transparent text-sm focus:outline-none ${
                        darkMode
                          ? 'text-zinc-100 placeholder-zinc-500'
                          : 'text-zinc-900 placeholder-zinc-400'
                      }`}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between px-2.5 py-2 border-t border-zinc-500/10">
                    <div className="flex items-center gap-1">
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
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition ${
                          darkMode
                            ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                        }`}
                        title="Lampirkan file dokumen/kode"
                      >
                        <Paperclip size={14} />
                        <span>Lampirkan</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleVoiceInput}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition ${
                          isListening
                            ? 'bg-red-500/15 text-red-500 animate-pulse'
                            : darkMode
                            ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                        }`}
                        title="Dikte Suara"
                      >
                        <Mic size={14} />
                        <span className="hidden sm:inline">Suara</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] hidden sm:inline ${
                          darkMode ? 'text-zinc-500' : 'text-zinc-400'
                        }`}
                      >
                        {activeModule.role}
                      </span>
                      <button
                        type="submit"
                        disabled={isLoading || (!input.trim() && !attachmentName)}
                        className={`p-1.5 rounded-lg transition ${
                          darkMode
                            ? 'bg-zinc-100 hover:bg-white text-zinc-950 disabled:opacity-30'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-30'
                        }`}
                        title="Kirim (Enter)"
                      >
                        <ArrowUp size={15} />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
