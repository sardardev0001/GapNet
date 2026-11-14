import type * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowRight, Check, CheckCheck, ChevronDown, CircleHelp, Download, Ellipsis,
  File, FileText, LogOut, Menu, MessageCircle, MessageCircleMore, MessageSquarePlus,
  Paperclip, Pencil, Plus, Search, Send, Settings, ShieldCheck, Smile, Sparkles,
  Trash2, UserRound, UsersRound, X, Zap, MonitorSmartphone, LockKeyhole, RefreshCw
} from 'lucide-react';
import { api, ApiError, downloadPrivateFile, loadSession, patch, post, remove, saveSession, websocketUrl } from './api';
import type { Conversation, Message, MessagePage, Session, SocketEvent, User } from './types';

type Tab = 'chats' | 'users' | 'settings';
type ModalMode = 'direct' | 'group' | null;
const MAX_FILE = 10 * 1024 * 1024;
const FILE_EXT = /\.(png|jpe?g|webp|gif|pdf|txt|zip)$/i;
const EMOJI = ['😊', '😂', '❤️', '👍', '🎉', '🙏', '👋', '🔥', '🌟', '✅', '💙', '😍'];
const formatTime = (date?: string | null) => date ? new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', timeZone: undefined }).format(new Date(date)) : '';

function Avatar({ user, size = 'md' }: { user?: User | null; size?: 'sm' | 'md' | 'lg' }) {
  const title = user?.display_name || user?.username || 'کاربر';
  const letter = title.trim().charAt(0).toUpperCase();
  return <div className={`avatar avatar-${size}`} title={title}>
    {letter}{user?.avatar_url && <img src={user.avatar_url} alt={title} referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} />}
    {user?.online && <span className="online-dot" aria-label="آنلاین" />}
  </div>;
}

function BrandMark({ small = false }: { small?: boolean }) {
  return <span className={`brand-mark${small ? ' small' : ''}`} aria-hidden="true">
    <MessageCircleMore size={small ? 23 : 27} strokeWidth={2.4} />
  </span>;
}

function WelcomeArt() {
  return <svg className="welcome-art" viewBox="0 0 470 286" role="img" aria-label="تصویر دو حباب گفتگو">
    <path d="M107 105C142 25 235 34 293 60c44 19 97 70 70 116-20 36-116 57-184 46-65-10-108-62-72-117Z" fill="#ecf7ff"/>
    <path d="M110 64l5-18M74 84l-13-12M64 124l-20-3" fill="none" stroke="#53a6e8" strokeWidth="8" strokeLinecap="round"/>
    <path d="M193 156c0-34 31-61 70-61h42c39 0 70 27 70 61v28c0 25-18 46-44 56l9 32-42-27h-35c-39 0-70-27-70-61v-28Z" fill="white" stroke="#7f93a7" strokeWidth="4" strokeLinejoin="round"/>
    <circle cx="251" cy="171" r="8" fill="#a3b2c0"/><circle cx="280" cy="171" r="8" fill="#a3b2c0"/><circle cx="309" cy="171" r="8" fill="#a3b2c0"/>
    <path d="M100 118c0-49 42-88 94-88h18c52 0 94 39 94 88v25c0 49-42 88-94 88h-40l-64 30 9-47c-11-17-17-37-17-59v-37Z" fill="#53a6e8" stroke="white" strokeWidth="6" strokeLinejoin="round"/>
    <circle cx="158" cy="140" r="10" fill="white"/><circle cx="201" cy="140" r="10" fill="white"/><circle cx="244" cy="140" r="10" fill="white"/>
    <path d="M386 195l19 10M395 225l9 10" stroke="#bac9d9" strokeWidth="7" strokeLinecap="round"/>
  </svg>;
}

function Welcome({ startChat }: { startChat: () => void }) {
  return <div className="welcome-stage">
    <div className="corner-wash top"/><div className="corner-wash bottom"/>
    <div className="welcome-content">
      <WelcomeArt />
      <h1>به گپ‌نت خوش آمدید! <span className="wave">👋</span></h1>
      <p>یکی از گفتگوها را انتخاب کنید یا با شروع یک گفتگوی جدید،<br className="desktop-break"/> با دوستان و همکاران خود در ارتباط باشید.</p>
      <button className="button primary welcome-button" onClick={startChat}><MessageSquarePlus size={22}/> شروع گفتگوی جدید</button>
      <div className="secure-note"><LockKeyhole size={16}/> پیام‌های شما به‌صورت خصوصی نگهداری می‌شوند.</div>
    </div>
  </div>;
}

function AuthScreen({ onSuccess }: { onSuccess: (session: Session) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const credentials = mode === 'register'
        ? { username: username.replace(/^@/, ''), display_name: displayName, password, password_confirm: confirm }
        : { username, password };
      const session = await post<Session>(mode === 'login' ? '/api/auth/login/' : '/api/auth/register/', credentials);
      saveSession(session); onSuccess(session);
    } catch (err) { setError(err instanceof Error ? err.message : 'خطای غیرمنتظره'); }
    finally { setBusy(false); }
  }
  return <div className="auth-background">
    <div className="auth-decoration decoration-a"/><div className="auth-decoration decoration-b"/>
    <header className="auth-top"><BrandMark/> <b>گپ‌نت</b><span>GapNet</span></header>
    <main className="auth-panel">
      <div className="auth-illustration"><WelcomeArt /></div>
      <div className="auth-form-pane">
        <div className="auth-icon"><MessageCircleMore size={30}/></div>
        <h1>{mode === 'login' ? 'خوش آمدید!' : 'به گپ‌نت بپیوندید'}</h1>
        <p>{mode === 'login' ? 'برای ادامه وارد حساب خود شوید.' : 'در چند لحظه حساب کاربری خود را بسازید.'}</p>
        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && <label>نام نمایشی<input required maxLength={80} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="مثلاً محمد احمدی" /></label>}
          <label>آیدی یکتا<input required dir="ltr" minLength={3} maxLength={30} pattern="@?[A-Za-z0-9_]{3,30}" value={username} onChange={e => setUsername(e.target.value)} placeholder="@username" autoComplete="username"/></label>
          <label>رمز عبور<input required type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="رمز عبور"/></label>
          {mode === 'register' && <label>تکرار رمز عبور<input required type="password" value={confirm} onChange={e => setConfirm(e.target.value)} minLength={8} autoComplete="new-password" placeholder="تکرار رمز عبور"/></label>}
          {error && <div className="error-alert" role="alert">{error}</div>}
          <button className="button primary auth-submit" type="submit" disabled={busy}>{busy ? 'لطفاً صبر کنید...' : mode === 'login' ? 'ورود به گپ‌نت' : 'ساخت حساب کاربری'} <ArrowRight size={18}/></button>
        </form>
        <button className="text-link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'حساب ندارید؟ ثبت‌نام کنید' : 'حساب دارید؟ وارد شوید'}
        </button>
      </div>
    </main>
    <footer className="auth-footer"><ShieldCheck size={16}/> تجربه‌ای ساده، روان و امن برای ارتباطات شما</footer>
  </div>;
}

function NewChatModal({ mode, onClose, onCreate, busy }: {
  mode: Exclude<ModalMode, null>; onClose: () => void;
  onCreate: (payload: unknown) => Promise<void>; busy: boolean;
}) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!query.trim()) { setMatches([]); return; }
    let alive = true;
    const timer = setTimeout(() => {
      api<User[]>(`/api/users/?q=${encodeURIComponent(query.trim())}`).then(data => {
        if (alive) setMatches(data);
      }).catch(() => { if (alive) setMatches([]); });
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [query]);
  async function create(payload: unknown) {
    setError('');
    try { await onCreate(payload); }
    catch (err) { setError(err instanceof Error ? err.message : 'خطا در ساخت گفتگو'); }
  }
  return <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} role="presentation">
    <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="new-chat-title">
      <div className="modal-top"><div><div className="modal-kicker">گپ‌نت</div><h2 id="new-chat-title">{mode === 'direct' ? 'گفتگوی جدید' : 'ایجاد گروه جدید'}</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="بستن"><X size={22}/></button></div>
      {mode === 'group' && <label className="modal-label">نام گروه<input maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="نام گروه را وارد کنید..."/></label>}
      <div className="search-box modal-search"><Search size={19}/><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="آیدی یا نام کاربر را جستجو کنید..." /></div>
      {mode === 'group' && selected.length > 0 && <div className="selected-members">{selected.map(user => <button key={user.id} className="chip" onClick={() => setSelected(prev => prev.filter(x => x.id !== user.id))}>{user.display_name} <X size={14}/></button>)}</div>}
      <div className="search-results">
        {!query.trim() ? <div className="modal-empty"><Search size={27}/><span>برای یافتن دوستان، آیدی آن‌ها را بنویسید.</span></div>
          : matches.length === 0 ? <div className="modal-empty">کاربری پیدا نشد.</div>
            : matches.map(user => {
              const isSelected = selected.some(s => s.id === user.id);
              return <button key={user.id} className="user-result" onClick={() => {
                if (mode === 'direct') void create({ username: user.username });
                else setSelected(prev => isSelected ? prev.filter(x => x.id !== user.id) : [...prev, user]);
              }} disabled={busy}>
                <Avatar user={user}/><span className="user-info"><strong>{user.display_name || user.username}</strong><small dir="ltr">@{user.username}</small></span>
                {mode === 'group' && (isSelected ? <Check className="selected-check"/> : <Plus size={19}/>)}
                {mode === 'direct' && <MessageCircle size={20} className="muted-icon"/>}
              </button>;
            })}
      </div>
      {error && <div className="error-alert">{error}</div>}
      {mode === 'group' && <button disabled={busy || !title.trim() || selected.length === 0} className="button primary modal-action" onClick={() => void create({ kind: 'group', title, member_ids: selected.map(s => s.id) })}>ایجاد گروه با {selected.length} عضو <UsersRound size={18}/></button>}
    </div>
  </div>;
}

function SettingsPanel({ user, onSaved, onLogout }: {
  user: User; onSaved: (user: User) => void; onLogout: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => { setDisplayName(user.display_name); setBio(user.bio || ''); setAvatarUrl(user.avatar_url || ''); }, [user]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setNotice('');
    try { const updated = await patch<User>('/api/me/', { display_name: displayName, bio, avatar_url: avatarUrl }); onSaved(updated); setNotice('تغییرات با موفقیت ذخیره شد.'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'ذخیره ناموفق بود.'); }
    finally { setBusy(false); }
  };
  return <div className="settings-stage"><div className="settings-card">
    <div className="settings-header"><div className="settings-badge"><Settings size={24}/></div><h2>تنظیمات حساب</h2><p>اطلاعات نمایشی حساب خود را مدیریت کنید.</p></div>
    <div className="settings-profile"><Avatar size="lg" user={user}/><div><strong>{user.display_name}</strong><span dir="ltr">@{user.username}</span></div></div>
    <form className="profile-form" onSubmit={submit}>
      <label>نام نمایشی<input required maxLength={80} value={displayName} onChange={e => setDisplayName(e.target.value)}/></label>
      <label>درباره من<textarea maxLength={160} rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="چند کلمه درباره خودتان..."/></label>
      <label>لینک تصویر پروفایل (اختیاری)<input dir="ltr" type="url" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.png"/></label>
      {notice && <p className="form-notice" role="status">{notice}</p>}
      <button className="button primary" disabled={busy}>{busy ? 'در حال ذخیره...' : 'ذخیره تغییرات'} <Check size={17}/></button>
    </form>
    <div className="settings-bottom"><span><ShieldCheck size={17}/> آیدی شما یکتاست و تغییر نمی‌کند.</span><button className="danger-link" onClick={onLogout}><LogOut size={18}/> خروج از حساب</button></div>
  </div></div>;
}

function UsersStage({ onChat, onGroup }: { onChat: (username: string) => Promise<void>; onGroup: () => void }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!query.trim()) { setUsers([]); setLoading(false); return; }
    let active = true; setLoading(true); setError('');
    const timer = setTimeout(() => {
      api<User[]>(`/api/users/?q=${encodeURIComponent(query.trim())}`).then(data => { if (active) setUsers(data); })
        .catch(err => { if (active) setError(err instanceof Error ? err.message : 'جستجو ناموفق بود'); })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);
  return <div className="users-stage"><div className="directory-card">
    <div className="directory-top"><div><span className="eyebrow">دوستان و همکاران</span><h2>جستجوی کاربران</h2><p>با آیدی یکتای دوستانتان در گپ‌نت ارتباط برقرار کنید.</p></div><button className="button outline" onClick={onGroup}><UsersRound size={18}/> گروه جدید</button></div>
    <div className="search-box directory-search"><Search size={20}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="مثلاً @mohammad" /></div>
    {loading && <div className="muted-message">در حال جستجو...</div>}
    {error && <div className="error-alert">{error}</div>}
    {query.trim() && !loading && users.length === 0 && !error && <div className="muted-message">کاربری با این مشخصات پیدا نشد.</div>}
    {!query.trim() && <div className="directory-empty"><UsersRound size={44}/><h3>دوستانتان را پیدا کنید</h3><p>برای شروع، آیدی یا نام آن‌ها را در کادر بالا وارد کنید.</p></div>}
    <div className="directory-results">{users.map(u => <div className="directory-user" key={u.id}><Avatar user={u}/><div className="user-info"><strong>{u.display_name}</strong><span dir="ltr">@{u.username}</span></div><button className="button outline small" onClick={() => void onChat(u.username)}>شروع گفتگو <MessageSquarePlus size={16}/></button></div>)}</div>
  </div></div>;
}

function ChatPanel({ conversation, user, messages, hasMore, loading, typing, onBack, onLoadMore,
  onSend, onTyping, onEdit, onDelete, onDownload, onToast }: {
  conversation: Conversation; user: User; messages: Message[]; hasMore: boolean;
  loading: boolean; typing: boolean; onBack: () => void; onLoadMore: () => void;
  onSend: (text: string, file: File | null) => Promise<boolean>; onTyping: (active: boolean) => void;
  onEdit: (message: Message, text: string) => Promise<void>; onDelete: (message: Message) => Promise<void>;
  onDownload: (message: Message) => Promise<void>; onToast: (notice: string) => void;
}) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const olderScrollHeight = useRef<number | null>(null);
  useEffect(() => {
    setText(''); setFile(null); setShowEmoji(false); setEditingId(null);
    olderScrollHeight.current = null;
  }, [conversation.id]);
  useEffect(() => {
    if (olderScrollHeight.current !== null && scroller.current) {
      scroller.current.scrollTop += scroller.current.scrollHeight - olderScrollHeight.current;
      olderScrollHeight.current = null;
    } else bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [conversation.id, messages.length]);
  async function send() {
    if (sending || (!text.trim() && !file)) return;
    setSending(true);
    const ok = await onSend(text.trim(), file);
    if (ok) { setText(''); setFile(null); onTyping(false); }
    setSending(false);
  }
  function chooseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.currentTarget.files?.[0];
    if (selected) {
      if (selected.size > MAX_FILE) onToast('حداکثر حجم فایل ۱۰ مگابایت است.');
      else if (!FILE_EXT.test(selected.name)) onToast('فرمت فایل پشتیبانی نمی‌شود.');
      else setFile(selected);
    }
    e.currentTarget.value = '';
  }
  const counterpart = conversation.participants.find(p => p.id !== user.id);
  return <div className="chat-stage">
    <div className="chat-topbar"><button className="icon-button mobile-back" onClick={onBack} aria-label="بازگشت"><ArrowRight size={21}/></button>
      <Avatar user={conversation.kind === 'direct' ? counterpart : undefined}/>
      <div className="chat-top-info"><strong>{conversation.display_title}</strong><span>{conversation.kind === 'group' ? `${conversation.participants.length} عضو` : counterpart?.online ? 'آنلاین' : 'گفتگوی خصوصی'}</span></div>
      <span className="chat-top-spacer"/><span className="chat-header-pill"><ShieldCheck size={15}/> گفتگوی خصوصی</span>
    </div>
    <div className="messages-scroller" ref={scroller}>
      {hasMore && <button className="load-older" onClick={() => { olderScrollHeight.current = scroller.current?.scrollHeight ?? null; onLoadMore(); }} disabled={loading}><ArrowDown size={16}/> پیام‌های قدیمی‌تر</button>}
      {loading && messages.length === 0 && <div className="muted-message">در حال دریافت پیام‌ها...</div>}
      {messages.length === 0 && !loading && <div className="no-messages"><MessageCircleMore size={38}/><strong>شروع یک گفتگوی تازه</strong><span>اولین پیامتان را همین حالا ارسال کنید.</span></div>}
      {messages.map(message => {
        const own = message.sender.id === user.id;
        return <div className={`message-row${own ? ' own' : ''}`} key={message.id}>
          {!own && <Avatar user={message.sender} size="sm"/>}
          <div className={`message-bubble${message.deleted_at ? ' deleted' : ''}`}>
            {conversation.kind === 'group' && !own && <span className="message-author">{message.sender.display_name}</span>}
            {editingId === message.id ? <div className="edit-message"><textarea autoFocus maxLength={4000} rows={2} value={editText} onChange={e => setEditText(e.target.value)}/><div><button onClick={() => setEditingId(null)} className="text-link">لغو</button><button className="button small primary" onClick={() => void onEdit(message, editText).then(() => setEditingId(null)).catch(() => undefined)}>ذخیره</button></div></div>
              : message.deleted_at ? <em>این پیام حذف شده است.</em>
                : <>{message.text && <p className="bubble-text">{message.text}</p>}
                  {message.attachment_url && <button className="attachment-card" onClick={() => void onDownload(message)}><FileText size={26}/><span>{message.attachment_name || 'فایل پیوست'}</span><Download size={17}/></button>}</>}
            <div className="message-meta"><time>{formatTime(message.created_at)}</time>{message.edited_at && !message.deleted_at && <span>ویرایش‌شده</span>}{own && (conversation.read_states?.some(state => state.user_id !== user.id && !!state.last_read_at && new Date(state.last_read_at).getTime() >= new Date(message.created_at).getTime()) ? <CheckCheck size={15} aria-label="خوانده شده"/> : <Check size={15} aria-label="ارسال شده"/>)}</div>
            {own && !message.deleted_at && editingId !== message.id && <div className="message-actions">
              {!message.attachment_url && <button title="ویرایش" onClick={() => { setEditingId(message.id); setEditText(message.text); }}><Pencil size={13}/></button>}
              <button title="حذف" onClick={() => void onDelete(message)}><Trash2 size={13}/></button>
            </div>}
          </div>
        </div>;
      })}
      {typing && <div className="typing-hint"><span className="typing-dots">•••</span> در حال نوشتن...</div>}
      <div ref={bottom}/>
    </div>
    <div className="composer-wrap">
      {file && <div className="pending-file"><File size={17}/><span>{file.name}</span><button onClick={() => setFile(null)} aria-label="حذف فایل"><X size={17}/></button></div>}
      {showEmoji && <div className="emoji-picker">{EMOJI.map(emoji => <button key={emoji} onClick={() => { setText(t => t + emoji); setShowEmoji(false); }}>{emoji}</button>)}</div>}
      <div className="composer"><input ref={fileInput} type="file" hidden accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.zip" onChange={chooseFile}/>
        <button title="افزودن فایل" className="composer-tool" onClick={() => fileInput.current?.click()}><Paperclip size={21}/></button>
        <button title="شکلک‌ها" className="composer-tool" onClick={() => setShowEmoji(!showEmoji)}><Smile size={21}/></button>
        <textarea rows={1} placeholder="پیام خود را بنویسید..." value={text} onChange={e => { setText(e.target.value); onTyping(true); }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} maxLength={4000}/>
        <button className="send-button" onClick={() => void send()} disabled={sending || (!text.trim() && !file)} aria-label="ارسال پیام"><Send size={20}/></button>
      </div>
      <div className="composer-tip">برای رفتن به خط بعدی Shift + Enter را بزنید.</div>
    </div>
  </div>;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [tab, setTab] = useState<Tab>('chats');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [chatFilter, setChatFilter] = useState('');
  const [modal, setModal] = useState<ModalMode>(null);
  const [creating, setCreating] = useState(false);
  const [typingUser, setTypingUser] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [socketStatus, setSocketStatus] = useState<'connected' | 'connecting' | 'offline'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const activeRef = useRef<string | null>(activeId);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = conversations.find(c => c.id === activeId) ?? null;
  const me = session?.user;
  activeRef.current = activeId;

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4500);
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!session) return;
    try { setConversations(await api<Conversation[]>('/api/conversations/')); }
    catch (error) { if (!(error instanceof ApiError && error.status === 401)) notify(error instanceof Error ? error.message : 'خطای دریافت گفتگوها'); }
  }, [session, notify]);

  useEffect(() => { if (session) void refreshConversations(); }, [session, refreshConversations]);
  useEffect(() => {
    if (!session) return;
    // Capture the authenticated user id while session is known to be non-null.
    // WebSocket callbacks run later, when React state may have changed.
    const currentUserId = session.user.id;
    let alive = true, timer: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | null = null;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    async function connect() {
      if (!alive) return;
      setSocketStatus('connecting');
      try {
        const { ticket } = await post<{ ticket: string }>('/api/ws-ticket/');
        if (!alive) return;
        socket = new WebSocket(websocketUrl(ticket));
        wsRef.current = socket;
        socket.onopen = () => {
          if (!alive) return;
          setSocketStatus('connected');
          clearInterval(heartbeat);
          heartbeat = setInterval(() => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' })); }, 45000);
        };
        socket.onmessage = event => {
          let item: SocketEvent;
          try { item = JSON.parse(event.data as string) as SocketEvent; } catch { return; }
          if (item.type === 'conversation.created' || item.type === 'conversation.updated' || item.type === 'conversation.read') {
            void refreshConversations();
          } else if (item.type === 'message.created' || item.type === 'message.updated') {
            if (item.conversation_id === activeRef.current) {
              if (item.type === 'message.created' && item.message.sender.id !== currentUserId) {
                void post(`/api/conversations/${item.conversation_id}/read/`, {}).catch(() => undefined);
              }
              setMessages(current => {
              const index = current.findIndex(m => m.id === item.message.id);
              if (index === -1) return [...current, item.message];
              const output = [...current]; output[index] = item.message; return output;
              });
            }
            void refreshConversations();
          } else if (item.type === 'typing' || item.type === 'typing.stop') {
            if (item.conversation_id === activeRef.current && item.user_id !== currentUserId) {
              setTypingUser(item.type === 'typing' ? item.user_id : null);
            }
          } else if (item.type === 'presence') {
            setConversations(current => current.map(conv => ({ ...conv,
              participants: conv.participants.map(u => u.id === item.user_id ? { ...u, online: item.online } : u),
            })));
          }
        };
        socket.onclose = () => {
          clearInterval(heartbeat);
          if (wsRef.current === socket) wsRef.current = null;
          if (alive) { setSocketStatus('offline'); timer = setTimeout(() => void connect(), 2500); }
        };
        socket.onerror = () => { socket?.close(); };
      } catch {
        if (alive) { setSocketStatus('offline'); timer = setTimeout(() => void connect(), 4000); }
      }
    }
    void connect();
    return () => { alive = false; clearTimeout(timer); clearInterval(heartbeat); socket?.close(); wsRef.current = null; };
  }, [session?.user.id, refreshConversations]);

  useEffect(() => {
    if (!activeId || !session) { setMessages([]); setNextCursor(null); return; }
    let alive = true;
    setLoadingMsgs(true); setTypingUser(null); setMessages([]); setNextCursor(null);
    api<MessagePage>(`/api/conversations/${activeId}/messages/`).then(result => {
      if (alive) { setMessages(result.items); setNextCursor(result.next_cursor); }
    }).catch(error => { if (alive) notify(error instanceof Error ? error.message : 'خطای دریافت پیام‌ها'); })
      .finally(() => { if (alive) setLoadingMsgs(false); });
    void post(`/api/conversations/${activeId}/read/`).then(() => refreshConversations()).catch(() => undefined);
    return () => { alive = false; };
  }, [activeId, session?.user.id]);

  async function loadOlder() {
    if (!activeId || !nextCursor || loadingMsgs) return;
    setLoadingMsgs(true);
    try {
      const page = await api<MessagePage>(`/api/conversations/${activeId}/messages/?before=${encodeURIComponent(nextCursor)}`);
      setMessages(current => [...page.items.filter(m => !current.some(x => x.id === m.id)), ...current]);
      setNextCursor(page.next_cursor);
    } catch (err) { notify(err instanceof Error ? err.message : 'خطا در دریافت پیام‌ها'); }
    finally { setLoadingMsgs(false); }
  }

  async function makeConversation(payload: unknown) {
    setCreating(true);
    try {
      const conversation = await post<Conversation>('/api/conversations/', payload);
      await refreshConversations(); setActiveId(conversation.id); setTab('chats'); setModal(null);
    } finally { setCreating(false); }
  }

  async function sendMessage(text: string, file: File | null): Promise<boolean> {
    if (!activeId) return false;
    try {
      const form = new FormData(); form.set('text', text); form.set('client_nonce', crypto.randomUUID());
      if (file) form.set('attachment', file);
      const result = await post<Message>(`/api/conversations/${activeId}/messages/`, form);
      setMessages(current => current.some(m => m.id === result.id) ? current : [...current, result]);
      void refreshConversations();
      return true;
    } catch (error) { notify(error instanceof Error ? error.message : 'پیام ارسال نشد. دوباره تلاش کنید.'); return false; }
  }

  function onTyping(isTyping: boolean) {
    if (!activeId || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: isTyping ? 'typing' : 'typing.stop', conversation_id: activeId }));
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (isTyping) typingTimer.current = setTimeout(() => onTyping(false), 1200);
  }
  async function editMessage(message: Message, text: string) {
    try {
      const updated = await patch<Message>(`/api/messages/${message.id}/`, { text });
      setMessages(current => current.map(m => m.id === updated.id ? updated : m));
      notify('پیام ویرایش شد.');
    } catch (err) { notify(err instanceof Error ? err.message : 'ویرایش ناموفق بود'); throw err; }
  }
  async function deleteMessage(message: Message) {
    if (!confirm('این پیام حذف شود؟')) return;
    try {
      const deleted = await remove<Message>(`/api/messages/${message.id}/`);
      setMessages(current => current.map(m => m.id === deleted.id ? deleted : m));
      void refreshConversations();
    } catch (err) { notify(err instanceof Error ? err.message : 'حذف پیام ناموفق بود'); }
  }
  async function download(message: Message) {
    if (!message.attachment_url) return;
    try { await downloadPrivateFile(message.attachment_url, message.attachment_name); }
    catch (err) { notify(err instanceof Error ? err.message : 'دریافت فایل ناموفق بود'); }
  }
  function logout() {
    wsRef.current?.close(); saveSession(null); setSession(null); setActiveId(null);
    setConversations([]); setMessages([]); setTab('chats');
  }
  function onProfileSaved(user: User) {
    if (!session) return;
    const next = { ...session, user }; saveSession(next); setSession(next);
  }
  const filtered = conversations.filter(c => {
    const term = chatFilter.trim().toLowerCase().replace(/^@/, '');
    return !term || c.display_title.toLowerCase().includes(term) || c.participants.some(u => u.username.toLowerCase().includes(term));
  });
  if (!session || !me) return <AuthScreen onSuccess={setSession}/>;

  return <div className={`app-shell${active ? ' chat-open' : ''}`}>
    <header className="topbar" id="native-titlebar"><div className="topbar-right"><strong className="app-name">گپ‌نت</strong><span className="top-divider"/><span className="header-subtitle"><span className={`status-light ${socketStatus}`}/>پیام‌رسان آنلاین</span></div>
      <div className="topbar-left"><span className="english-logo">GapNet</span><BrandMark small /></div></header>
    <div className="app-body">
      <aside className="nav-rail" aria-label="منوی اصلی"><div className="rail-top"><BrandMark small/></div>
        <nav>
          <button onClick={() => setTab('chats')} className={`rail-item${tab === 'chats' ? ' selected' : ''}`}><MessageCircleMore size={26}/><span>چت‌ها</span></button>
          <button onClick={() => setTab('users')} className={`rail-item${tab === 'users' ? ' selected' : ''}`}><UsersRound size={25}/><span>کاربران</span></button>
          <button onClick={() => setTab('settings')} className={`rail-item${tab === 'settings' ? ' selected' : ''}`}><Settings size={25}/><span>تنظیمات</span></button>
        </nav>
        <div className="rail-bottom"><button onClick={() => setTab('settings')} className="rail-avatar" title="حساب من"><Avatar user={me}/></button></div>
      </aside>
      {tab === 'chats' && <div className="conversation-panel">
        <div className="conversation-heading"><div className="conversation-title-row"><MessageCircleMore size={26}/><h2>گفتگوهای من</h2><span className="count-pill">{conversations.length.toLocaleString('fa-IR')}</span></div><p>دوستان و ارتباطات شما در گپ‌نت</p></div>
        <div className="conversation-toolbar"><div className="search-box"><Search size={21}/><input value={chatFilter} onChange={e => setChatFilter(e.target.value)} placeholder="جستجو در گفتگوها، پیام‌ها یا کاربران..." aria-label="جستجوی گفتگوها"/></div>
          <button className="button primary create-chat" onClick={() => setModal('direct')}><Plus size={21}/> گفتگوی جدید <MessageSquarePlus size={20}/></button>
          <button className="group-link" onClick={() => setModal('group')}><UsersRound size={16}/> ساخت گروه جدید</button>
        </div>
        <div className="conversation-list-head"><span>پیام‌های اخیر</span><span>{filtered.length.toLocaleString('fa-IR')} گفتگو</span></div>
        <div className="conversation-list">
          {filtered.length === 0 && <div className="list-empty"><MessageCircle size={29}/><span>{chatFilter ? 'گفتگویی پیدا نشد.' : 'هنوز گفتگویی ندارید.'}</span><button onClick={() => setModal('direct')}>اولین گفتگو را شروع کنید</button></div>}
          {filtered.map(c => {
            const other = c.participants.find(u => u.id !== me.id);
            const last = c.last_message;
            return <button className={`conversation-item${activeId === c.id ? ' active' : ''}`} onClick={() => { setActiveId(c.id); setTab('chats'); }} key={c.id}>
              <Avatar user={c.kind === 'direct' ? other : undefined}/>
              <span className="conversation-copy"><strong>{c.display_title}</strong><small>{last ? last.deleted_at ? 'این پیام حذف شده است.' : last.attachment_name ? `📎 ${last.attachment_name}` : last.text : c.kind === 'group' ? `${c.participants.length} عضو` : 'گفتگو را شروع کنید...'}</small></span>
              <span className="conversation-meta"><time>{formatTime(last?.created_at || c.updated_at)}</time>{c.unread_count > 0 && <b>{c.unread_count.toLocaleString('fa-IR')}</b>}</span>
            </button>;
          })}
        </div>
      </div>}
      <main className={`main-stage ${tab !== 'chats' ? 'full-stage' : ''}`}>
        {tab === 'chats' && (active ? <ChatPanel key={active.id} conversation={active} user={me} messages={messages} hasMore={!!nextCursor} loading={loadingMsgs}
          typing={typingUser != null} onBack={() => setActiveId(null)} onLoadMore={() => void loadOlder()} onSend={sendMessage} onTyping={onTyping}
          onEdit={editMessage} onDelete={deleteMessage} onDownload={download} onToast={notify}/>
          : <Welcome startChat={() => setModal('direct')}/>)}
        {tab === 'users' && <UsersStage onChat={async username => { try { await makeConversation({ username }); } catch (err) { notify(err instanceof Error ? err.message : 'خطا در ساخت گفتگو'); } }} onGroup={() => setModal('group')}/>}
        {tab === 'settings' && <SettingsPanel user={me} onSaved={onProfileSaved} onLogout={logout}/>}
      </main>
    </div>
    {modal && <NewChatModal mode={modal} onClose={() => setModal(null)} onCreate={makeConversation} busy={creating}/>}
    {toast && <div className="toast" role="status"><CircleHelp size={18}/>{toast}<button aria-label="بستن" onClick={() => setToast('')}><X size={16}/></button></div>}
  </div>;
}
