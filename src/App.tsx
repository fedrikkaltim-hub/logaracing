import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleHelp,
  Gauge,
  Headphones,
  KeyRound,
  LogIn,
  LogOut,
  MonitorPlay,
  Play,
  Radio,
  RotateCcw,
  ShieldCheck,
  Signal,
  Sparkles,
  Trophy,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'
import katex from 'katex'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { QUESTIONS, shuffle, type EquationPart, type Question } from './lib/questions'
import { isSupabaseConfigured, recordPlayer, supabase, upsertSession, verifyTeacher } from './lib/supabase'
import type { PlayerPresence, RaceStatus } from './lib/types'

const ROOM = 'logaracing-room-v1'
const COLORS = ['#f04455', '#1365e7', '#13ae77', '#ff9d2e', '#8d5cf6', '#e347a5', '#05a6c9', '#25354f']
const TRACK_POINTS = [
  [115, 382], [173, 435], [292, 446], [380, 398], [405, 321], [345, 262],
  [395, 195], [510, 143], [668, 147], [775, 201], [854, 289], [823, 378],
  [720, 422], [610, 402], [574, 337], [621, 279], [738, 277], [803, 223],
  [770, 136], [661, 84], [487, 78], [346, 121], [245, 192], [177, 285], [115, 382],
] as const

type View = 'role' | 'student-login' | 'student-dashboard' | 'teacher-login' | 'teacher-dashboard' | 'race'
type StudentState = PlayerPresence
type RacePhase = 'initial' | 'replay'
type StudentRace = {
  plan: Question[]
  initialIndex: number
  replayQueue: Question[]
  replayIndex: number
  pendingWrong: Question[]
  phase: RacePhase
  current: Question | null
  score: number
  answered: number
  finished: boolean
  lastWasCorrect: boolean | null
}

function makePlayerId() {
  const stored = localStorage.getItem('logaracing-player-id')
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem('logaracing-player-id', id)
  return id
}

function equationText(parts: EquationPart[]) {
  return parts.map((part, index) => (
    <span key={`${part.text}-${index}`}>
      {part.text}
      {part.sub && <sub>{part.sub}</sub>}
      {part.sup && <sup>{part.sup}</sup>}
    </span>
  ))
}

function LogoMark() {
  return <div className="logo-mark" aria-hidden="true"><span>LR</span><i /></div>
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'brand--compact' : ''}`}>
    <LogoMark />
    <div>
      <strong>LOGA<span>RACING</span></strong>
      {!compact && <small>TANTANGAN LOGARITMA • SMA</small>}
    </div>
  </div>
}

function Button({ children, variant = 'primary', onClick, disabled, type = 'button', className = '', icon }: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'ready'
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
  icon?: ReactNode
}) {
  return <button type={type} disabled={disabled} onClick={onClick} className={`btn btn--${variant} ${className}`}>
    {icon}<span>{children}</span><i className="btn__sheen" />
  </button>
}

function AppShell({ children, onHome, status, right }: { children: ReactNode; onHome?: () => void; status?: string; right?: ReactNode }) {
  return <main className="app-shell">
    <header className="topbar">
      <div className="topbar__left">
        {onHome && <button className="icon-button" onClick={onHome} aria-label="Kembali ke halaman awal"><ArrowLeft size={18} /></button>}
        <Brand compact />
      </div>
      <div className="topbar__right">
        {status && <span className="status-chip"><span className="status-dot" />{status}</span>}
        {right}
      </div>
    </header>
    {children}
  </main>
}

function RoleScreen({ onStudent, onTeacher }: { onStudent: () => void; onTeacher: () => void }) {
  return <div className="role-screen">
    <div className="role-screen__glow role-screen__glow--one" />
    <div className="role-screen__glow role-screen__glow--two" />
    <div className="role-screen__grid" />
    <div className="role-screen__topbar">
      <Brand />
      <span className="edition-pill"><Sparkles size={13} /> DIGITAL TRACK • 01</span>
    </div>
    <div className="start-lights" aria-label="Lampu start">
      {Array.from({ length: 5 }).map((_, index) => <span key={index} className="start-light" />)}
    </div>
    <div className="role-screen__content">
      <div className="eyebrow"><span /> MATH RACING EXPERIENCE <span /></div>
      <h1>Tantang logaritma.<br /><em>Taklukkan lintasan.</em></h1>
      <p className="hero-copy">Balapan satu lap dengan 10 tantangan. Setiap jawaban benar menggeser mobilmu menuju garis finis.</p>
      <div className="role-cards">
        <button className="role-card role-card--teacher" onClick={onTeacher}>
          <div className="role-card__icon"><MonitorPlay size={25} /></div>
          <div><strong>MASUK SEBAGAI GURU</strong><small>Ruang kendali & leaderboard live</small></div>
          <ChevronRight size={20} />
        </button>
        <button className="role-card role-card--student" onClick={onStudent}>
          <div className="role-card__icon"><Gauge size={25} /></div>
          <div><strong>MASUK SEBAGAI SISWA</strong><small>Garage, cockpit & tantanganmu</small></div>
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="role-screen__meta"><span><ShieldCheck size={14} /> Fair play enabled</span><span><Signal size={14} /> Live classroom mode</span><span><Zap size={14} /> 10 questions • 1 lap</span></div>
    </div>
    <div className="start-line" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /></div>
    <div className="track-lines" aria-hidden="true"><i /><i /><i /></div>
    <footer className="role-screen__footer"><span>SMAN 2 SANGATTA UTARA • KELAS X</span><span>EDU-ESPORTS PLATFORM / 2026</span></footer>
  </div>
}

function TeacherLogin({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const valid = await verifyTeacher(username.trim(), password)
    setLoading(false)
    if (!valid) {
      setError('Username atau password belum cocok. Coba kembali.')
      return
    }
    sessionStorage.setItem('logaracing-teacher', '1')
    onSuccess()
  }

  return <AppShell onHome={onBack} status="SECURE ACCESS">
    <section className="auth-layout">
      <div className="auth-art auth-art--control">
        <div className="auth-art__label"><Radio size={15} /> CONTROL ROOM / T-01</div>
        <div className="control-radar"><span /><span /><span /></div>
        <div className="auth-art__copy"><span className="eyebrow eyebrow--left">TEACHER COMMAND</span><h1>Atur strategi.<br /><em>Start the room.</em></h1><p>Pantau kesiapan siswa dan mulai balapan dari satu dashboard terpusat.</p></div>
        <div className="control-art__metrics"><div><strong>01</strong><span>LIVE RACE</span></div><div><strong>10</strong><span>QUESTIONS</span></div><div><strong>01</strong><span>LAP</span></div></div>
      </div>
      <div className="auth-panel">
        <div className="auth-panel__heading"><div className="mini-kicker"><KeyRound size={14} /> GURU / AUTHENTICATION</div><h2>Masuk ke ruang kendali</h2><p>Gunakan akun guru untuk membuka kontrol balapan kelas.</p></div>
        <form className="auth-form" onSubmit={submit}>
          <label>USERNAME<input autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} placeholder="Masukkan username" /></label>
          <label>PASSWORD<input autoComplete="current-password" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Masukkan password" /></label>
          {error && <div className="form-error"><CircleHelp size={16} /> {error}</div>}
          <Button type="submit" disabled={loading || !username || !password} icon={<LogIn size={18} />}>{loading ? 'MEMERIKSA…' : 'MASUK KE DASHBOARD'}</Button>
        </form>
        <div className="auth-panel__note"><ShieldCheck size={17} /><span>Akses guru dilindungi oleh verifikasi kredensial. Data kelas hanya terlihat saat sesi aktif.</span></div>
      </div>
    </section>
  </AppShell>
}

function StudentLogin({ onBack, onReady }: { onBack: () => void; onReady: (student: StudentState) => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[1])
  const [focused, setFocused] = useState(false)
  const ready = name.trim().length >= 2

  return <AppShell onHome={onBack} status="STUDENT GARAGE">
    <section className="garage-layout">
      <div className="garage-hero">
        <div className="garage-hero__lights" />
        <div className="garage-hero__sign">PIT LANE <span>10</span></div>
        <div className="garage-car" style={{ '--car-color': color } as React.CSSProperties}><span /><i /><b /></div>
        <div className="garage-hero__copy"><div className="mini-kicker"><Gauge size={14} /> GARAGE / GRID 01</div><h1>Siapkan mobilmu,<br /><em>siapkan pikiranmu.</em></h1><p>Pilih warna tim dan masukkan nama yang akan tampil di leaderboard guru.</p></div>
        <div className="garage-hero__telemetry"><span>TYRE TEMP <strong>94°C</strong></span><span>FUEL <strong>87%</strong></span><span>ERS <strong>READY</strong></span></div>
      </div>
      <div className="garage-panel">
        <div className="panel-kicker">DRIVER PROFILE / 01</div><h2>Kenalkan dirimu ke grid</h2>
        <label className={`field-label ${focused ? 'is-focused' : ''}`}>NAMA PEMBALAP<input autoFocus value={name} maxLength={22} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={event => setName(event.target.value)} placeholder="Masukkan namamu" /></label>
        <div className="color-picker"><div className="field-label">WARNA MOBIL</div><div className="swatches">{COLORS.map(item => <button key={item} aria-label={`Pilih warna ${item}`} className={`swatch ${color === item ? 'is-selected' : ''}`} style={{ backgroundColor: item }} onClick={() => setColor(item)}><span>{color === item && <Check size={14} />}</span></button>)}</div></div>
        <div className="ready-preview"><div className="ready-preview__car" style={{ '--car-color': color } as React.CSSProperties}><span /></div><div><small>GRID ID</small><strong>{name.trim() ? name.trim().toUpperCase() : 'YOUR NAME'}</strong></div><span className={`ready-badge ${ready ? 'is-ready' : ''}`}><span />{ready ? 'READY' : 'WAITING'}</span></div>
        <Button variant="ready" disabled={!ready} onClick={() => onReady({ playerId: makePlayerId(), name: name.trim(), color, ready: true, score: 0, answered: 0, finished: false, onlineAt: new Date().toISOString() })} icon={<Zap size={18} />}>{ready ? 'READY TO RACE' : 'ISI NAMA UNTUK SIAP'}</Button>
        <p className="garage-panel__tip"><Sparkles size={14} /> Jawaban benar memajukan mobil. Jawaban yang salah akan kembali setelah putaran pertanyaan awal.</p>
      </div>
    </section>
  </AppShell>
}

function EmptyGrid() {
  return <div className="empty-grid"><div className="empty-grid__icon"><Users size={24} /></div><strong>Belum ada siswa online</strong><span>Daftar siswa akan muncul otomatis saat mereka menekan READY di garage.</span></div>
}

function TrackMap({ players, showFinish = false }: { players: PlayerPresence[]; showFinish?: boolean }) {
  const point = (progress: number, lane: number) => {
    const normalized = Math.max(0, Math.min(0.98, progress))
    const scaled = normalized * (TRACK_POINTS.length - 1)
    const index = Math.floor(scaled)
    const fraction = scaled - index
    const from = TRACK_POINTS[index]
    const to = TRACK_POINTS[index + 1]
    const laneShift = ((lane % 3) - 1) * 5
    return { x: from[0] + (to[0] - from[0]) * fraction + laneShift, y: from[1] + (to[1] - from[1]) * fraction + laneShift }
  }

  const path = TRACK_POINTS.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`).join(' ')
  return <div className="track-map">
    <svg viewBox="0 0 970 510" role="img" aria-label="Lintasan balap melingkar dengan posisi siswa">
      <defs><filter id="trackShadow"><feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#0e2440" floodOpacity=".13" /></filter><linearGradient id="trackGradient" x1="0" x2="1"><stop stopColor="#1b3352" /><stop offset=".5" stopColor="#10243c" /><stop offset="1" stopColor="#284b71" /></linearGradient></defs>
      <path d={path} fill="none" stroke="#d3dce9" strokeWidth="90" strokeLinecap="round" strokeLinejoin="round" filter="url(#trackShadow)" />
      <path d={path} fill="none" stroke="url(#trackGradient)" strokeWidth="78" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path} fill="none" stroke="#5f7898" strokeWidth="2" strokeDasharray="12 13" opacity=".8" />
      <path d="M111 341 L151 357 M111 356 L151 372 M111 371 L151 387 M111 386 L151 402" stroke="#f6fbff" strokeWidth="6" />
      <path d="M93 333 L128 347 M93 348 L128 362 M93 363 L128 377 M93 378 L128 392" stroke="#ed4052" strokeWidth="6" />
      {Array.from({ length: 11 }).map((_, index) => <circle key={index} cx={index === 10 ? 895 : 95 + index * 76} cy={index === 10 ? 470 : 454} r="2.5" fill="#21d9d1" opacity=".7" />)}
      {players.map((player, index) => {
        const progress = player.finished ? 0.97 : Math.min(0.96, player.score / 10 + (player.answered % 3) * 0.008)
        const pos = point(progress, index)
        return <g key={player.playerId} className="track-player" transform={`translate(${pos.x} ${pos.y})`}>
          <circle r="17" fill={player.color} opacity=".2" className="track-player__halo" />
          <circle r="10" fill={player.color} stroke="#ffffff" strokeWidth="3" />
          <text x="17" y="4" fill="#f4f8ff" fontSize="10" fontWeight="700">{player.name.length > 13 ? `${player.name.slice(0, 12)}…` : player.name}</text>
          <text x="17" y="16" fill="#9eb1c7" fontSize="8">{player.finished ? 'FINISH' : `${player.score}/10`}</text>
        </g>
      })}
      {showFinish && <g transform="translate(883 96)"><circle r="18" fill="#23e0b1" opacity=".18" /><path d="M-7 2h15M-5 2v-9h10v9M-5-7h-4M5-7h4" stroke="#23e0b1" strokeWidth="2" fill="none" /></g>}
    </svg>
    <div className="track-map__legend"><span><i className="legend-dot legend-dot--blue" /> START / GRID</span><span><i className="legend-dot legend-dot--green" /> FINISH LINE</span><span><Gauge size={13} /> Progress berdasarkan jawaban benar</span></div>
  </div>
}

function TeacherDashboard({ students, raceStatus, onStart, onStop, onLogout, soundOn, onSoundToggle }: {
  students: PlayerPresence[]
  raceStatus: RaceStatus
  onStart: () => void
  onStop: () => void
  onLogout: () => void
  soundOn: boolean
  onSoundToggle: () => void
}) {
  const readyCount = students.filter(student => student.ready).length
  const finishers = students.filter(student => student.finished).length
  const sorted = [...students].sort((a, b) => b.score - a.score || a.answered - b.answered)
  const canStart = readyCount > 0 && raceStatus === 'lobby'
  return <AppShell status={raceStatus === 'racing' ? 'RACE LIVE' : 'TEACHER CONTROL'} right={<>
    <button className="icon-button icon-button--sound" onClick={onSoundToggle} aria-label="Nyalakan atau matikan backsound"><span className={soundOn ? 'sound-wave is-on' : 'sound-wave'}>{soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}</span></button>
    <button className="icon-button" onClick={onLogout} aria-label="Keluar"><LogOut size={17} /></button>
  </>}>
    <section className="dashboard-wrap dashboard-wrap--teacher">
      <div className="dashboard-heading"><div><div className="mini-kicker"><MonitorPlay size={14} /> TEACHER CONTROL / LIVE GRID</div><h1>Ruang kendali <em>kelas.</em></h1><p>Pantau koneksi dan biarkan setiap jawaban benar mengubah posisi di lintasan.</p></div><div className="dashboard-heading__badges"><span className="live-badge"><span /> {raceStatus === 'racing' ? 'LIVE SESSION' : 'WAITING ROOM'}</span><span className="session-id">ROOM / LOGA-01</span></div></div>
      <div className="control-grid">
        <div className="control-main">
          <div className="control-main__top"><div><span className="panel-kicker">CIRCUIT OVERVIEW</span><h2>LOGARACING GRAND PRIX <span>•</span> 1 LAP</h2></div><div className="race-status"><span className={raceStatus === 'racing' ? 'pulse-dot' : 'idle-dot'} />{raceStatus === 'racing' ? 'BALAPAN BERLANGSUNG' : raceStatus === 'finished' ? 'BALAPAN SELESAI' : 'MENUNGGU START'}</div></div>
          <TrackMap players={sorted} showFinish={raceStatus !== 'lobby'} />
          <div className="control-actions"><div className="start-progress"><div className="start-progress__label"><span><Users size={14} /> {students.length === 0 ? '0/0' : `${readyCount}/${students.length}`} SISWA READY</span><span>{finishers}/10 FINISH</span></div><div className="progress-rail"><span style={{ width: `${students.length ? Math.round(readyCount / students.length * 100) : 0}%` }} /></div></div>{raceStatus === 'lobby' && <Button disabled={!canStart} onClick={onStart} icon={<Play size={18} />}>MULAI BALAPAN</Button>}{raceStatus === 'racing' && <Button variant="danger" onClick={onStop} icon={<RotateCcw size={17} />}>HENTIKAN SESI</Button>}{raceStatus === 'finished' && <Button variant="secondary" onClick={onStop} icon={<RotateCcw size={17} />}>SIAPKAN GRID BARU</Button>}</div>
        </div>
        <aside className="leaderboard-panel"><div className="panel-head"><div><span className="panel-kicker">LIVE LEADERBOARD</span><h2>Posisi pembalap</h2></div><span className="online-count"><span /> {students.length} ONLINE</span></div>{students.length === 0 ? <EmptyGrid /> : <div className="leaderboard-list">{sorted.map((student, index) => <div className={`leaderboard-row ${student.finished ? 'is-finished' : ''}`} key={student.playerId}><span className="rank">{String(index + 1).padStart(2, '0')}</span><span className="player-color" style={{ backgroundColor: student.color }} /><div className="player-copy"><strong>{student.name}</strong><span>{student.finished ? 'FINISHED • 10/10' : `${student.score}/10 BENAR • ${student.answered} ATTEMPT`}</span></div><span className={`player-state ${student.finished ? 'is-finished' : student.ready ? 'is-ready' : ''}`}>{student.finished ? <Trophy size={14} /> : student.ready ? 'READY' : 'WAITING'}</span></div>)}</div>}
          <div className="leaderboard-foot"><span><Signal size={13} /> PRESENCE SYNC ACTIVE</span><span>{isSupabaseConfigured ? 'SUPABASE REALTIME' : 'LOCAL PREVIEW'}</span></div>
        </aside>
      </div>
      <div className="teacher-tip"><span className="teacher-tip__icon"><Sparkles size={17} /></span><div><strong>Aturan balapan</strong><span>Setiap siswa menuntaskan 10 jawaban benar. Siswa yang salah akan mengulang soal tersebut setelah 10 soal awal selesai. Sesi berhenti otomatis saat 10 pembalap pertama mencapai FINISH.</span></div></div>
    </section>
  </AppShell>
}

function StudentDashboard({ student, students, raceStatus, onLeave }: { student: StudentState; students: PlayerPresence[]; raceStatus: RaceStatus; onLeave: () => void }) {
  const onlineCount = students.length || 1
  return <AppShell onHome={onLeave} status={raceStatus === 'racing' ? 'RACE LIVE' : 'STUDENT DASHBOARD'} right={<span className="status-chip status-chip--soft"><span className="status-dot status-dot--green" />{students.length} DRIVERS ONLINE</span>}>
    <section className="student-dashboard">
      <div className="student-dashboard__hero"><div><div className="mini-kicker"><Gauge size={14} /> DRIVER DASHBOARD / GRID {String(Math.max(1, students.findIndex(item => item.playerId === student.playerId) + 1)).padStart(2, '0')}</div><h1>Selamat datang,<br /><em>{student.name}.</em></h1><p>{raceStatus === 'lobby' ? 'Tunggu guru menekan tombol start. Pastikan fokus dan siap melaju.' : raceStatus === 'finished' ? 'Kamu sudah melewati garis finis. Kerja bagus, pembalap!' : 'Balapan sedang berlangsung. Pertahankan ritme dan baca setiap logaritma.'}</p></div><div className="student-dashboard__car" style={{ '--car-color': student.color } as React.CSSProperties}><span className="car-ring" /><span className="car-body" /><span className="car-light" /></div></div>
      <div className="student-dashboard__grid"><div className="driver-card"><div className="driver-card__head"><span className="panel-kicker">YOUR TELEMETRY</span><span className="driver-card__online"><span /> ONLINE</span></div><div className="driver-card__score"><strong>{student.score}</strong><span>/10<br />CORRECT</span></div><div className="driver-card__stats"><div><span>ATTEMPTS</span><strong>{student.answered}</strong></div><div><span>LAP</span><strong>01<span>/01</span></strong></div><div><span>GRID</span><strong>#{String(Math.max(1, students.findIndex(item => item.playerId === student.playerId) + 1)).padStart(2, '0')}</strong></div></div><div className="driver-progress"><div><span>FINISH PROGRESS</span><strong>{Math.round(student.score / 10 * 100)}%</strong></div><div className="progress-rail"><span style={{ width: `${student.score / 10 * 100}%`, backgroundColor: student.color }} /></div></div></div><div className="waiting-card"><div className="waiting-card__radar"><span /><span /><span /><Gauge size={26} /></div><div>{raceStatus === 'lobby' ? <><span className="panel-kicker">GRID STATUS</span><h2>Menunggu lampu start</h2><p>Guru akan memulai balapan untuk seluruh kelas sekaligus.</p></> : raceStatus === 'finished' ? <><span className="panel-kicker">RESULT STATUS</span><h2>{student.finished ? 'FINISH LINE CLEARED' : 'SESSION ENDED'}</h2><p>Terima kasih sudah ikut balapan. Hasilmu sudah tersinkron.</p></> : <><span className="panel-kicker">RACE STATUS</span><h2>You're on the grid</h2><p>Soal berikutnya akan muncul di cockpit-mu.</p></>}</div></div></div>
      <div className="student-dashboard__footer"><span><Radio size={14} /> LIVE PRESENCE / ROOM LOGA-01</span><span>{onlineCount} driver{onlineCount > 1 ? 's' : ''} connected</span></div>
    </section>
  </AppShell>
}

function Equation({ parts }: { parts: EquationPart[] }) {
  const latex = parts.map(part => `${part.text === 'log' ? '\\log' : part.text}${part.sub ? `_{${part.sub}}` : ''}${part.sup ? `^{${part.sup}}` : ''}`).join('')
  const html = katex.renderToString(latex, { throwOnError: false, displayMode: false })
  return <span className="equation" dangerouslySetInnerHTML={{ __html: html }} />
}

function AnswerButton({ letter, text, onClick, disabled, state }: { letter: string; text: string; onClick: () => void; disabled: boolean; state: 'idle' | 'correct' | 'wrong' }) {
  return <button disabled={disabled} onClick={onClick} className={`answer-button answer-button--${state}`}><span className="answer-button__letter">{letter}</span><span className="answer-button__text">{text}</span><ArrowRight size={18} /></button>
}

function Cockpit({ student, race, onAnswer, onExit }: { student: StudentState; race: StudentRace; onAnswer: (index: number) => void; onExit: () => void }) {
  const question = race.current
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const answer = (index: number) => {
    if (!question || selected !== null) return
    setSelected(index)
    const isCorrect = index === question.answer
    setFeedback(isCorrect ? 'correct' : 'wrong')
    window.setTimeout(() => { onAnswer(index); setSelected(null); setFeedback(null) }, 520)
  }
  const progress = Math.min(100, race.score / 10 * 100)
  return <div className="cockpit-screen">
    <div className="cockpit__sky"><div className="cockpit__horizon" /><div className="cockpit__scanlines" /><div className="cockpit__lights"><i /><i /><i /><i /><i /><i /><i /></div></div>
    <header className="cockpit-topbar"><Brand compact /><div className="cockpit-topbar__center"><span className="lap-chip">LAP <strong>01</strong><i>/01</i></span><span className="cockpit-live"><span /> LIVE</span></div><button className="icon-button" onClick={onExit} aria-label="Keluar dari cockpit"><LogOut size={17} /></button></header>
    <div className="cockpit-hud cockpit-hud--left"><span className="hud-label">DRIVER</span><strong>{student.name.toUpperCase()}</strong><div className="hud-bars"><i /><i /><i /><i /><i /></div><small>ERS 100% • TYRE PRIME</small></div>
    <div className="cockpit-hud cockpit-hud--right"><span className="hud-label">CORRECT ANSWERS</span><strong>{String(race.score).padStart(2, '0')}<i>/10</i></strong><div className="hud-progress"><span style={{ width: `${progress}%` }} /></div><small>{race.phase === 'replay' ? 'REPLAY WRONG ANSWERS' : 'FIRST RUN'}</small></div>
    <div className="windshield">
      <div className="windshield__glass"><span /><span /><span /></div>
      {race.lastWasCorrect !== null && <div className={`feedback-burst ${race.lastWasCorrect ? 'is-correct' : 'is-wrong'}`}>{race.lastWasCorrect ? 'OVERTAKE +1' : 'KEEP PUSHING'}</div>}
      <div className="question-hud"><div className="question-hud__top"><span className="panel-kicker">QUESTION {String(race.answered + 1).padStart(2, '0')} / {race.phase === 'initial' ? '10' : 'REPLAY'}</span><span className="concept-chip"><Sparkles size={13} /> {question?.concept ?? 'FINISH'}</span></div>{question ? <><h1>{question.prompt}</h1><div className="question-equation"><Equation parts={question.parts} /><span className="equation-equals">= ?</span></div><div className="answer-grid">{question.options.map((option, index) => <AnswerButton key={option} letter={String.fromCharCode(65 + index)} text={option} disabled={selected !== null} state={selected === index ? feedback ?? 'idle' : 'idle'} onClick={() => answer(index)} />)}</div><div className="question-tip"><CircleHelp size={15} /> Pilih jawaban terbaik. Jika salah, soal akan kembali setelah semua pertanyaan awal.</div></> : <div className="cockpit-finish"><div className="finish-icon"><Trophy size={32} /></div><span className="panel-kicker">FINISH LINE CLEARED</span><h1>Balapanmu selesai.</h1><p>Menunggu guru menutup sesi dan mengumumkan 10 finisher pertama.</p><Button variant="secondary" onClick={onExit} icon={<ArrowLeft size={17} />}>KEMBALI KE DASHBOARD</Button></div>}</div>
    </div>
    <div className="steering-wheel"><div className="steering-wheel__top"><span /><span /><span /><span /><span /><span /><span /></div><div className="steering-wheel__rim"><div className="wheel-spoke wheel-spoke--left" /><div className="wheel-spoke wheel-spoke--right" /><div className="wheel-center"><span>LR</span><small>01</small></div></div><div className="wheel-readout"><span>RPM</span><i /><i /><i /><i /><i /><strong>8.4K</strong></div></div>
    <footer className="cockpit-footer"><span><Gauge size={14} /> SPEED 218 KM/H</span><span><Zap size={14} /> DRS AVAILABLE</span><span><Radio size={14} /> NET 24 MS</span></footer>
  </div>
}

function useSynthTheme(enabled: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  useEffect(() => {
    const audioUrl = import.meta.env.VITE_F1_AUDIO_URL
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audio.loop = true
      audio.volume = 0.16
      audioRef.current = audio
      if (enabled) void audio.play().catch(() => undefined)
      return () => { audio.pause(); audioRef.current = null }
    }
    if (!enabled) {
      contextRef.current?.close().catch(() => undefined)
      contextRef.current = null
      return
    }
    const context = new AudioContext()
    contextRef.current = context
    const master = context.createGain()
    master.gain.value = 0.035
    master.connect(context.destination)
    const notes = [110, 138.59, 164.81, 220, 164.81, 138.59]
    let step = 0
    const timer = window.setInterval(() => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sawtooth'
      oscillator.frequency.value = notes[step % notes.length]
      gain.gain.setValueAtTime(0.0001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.28, context.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18)
      oscillator.connect(gain).connect(master)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.2)
      step += 1
    }, 210)
    return () => { window.clearInterval(timer); context.close().catch(() => undefined); contextRef.current = null }
  }, [enabled])
  useEffect(() => {
    if (audioRef.current) {
      if (enabled) void audioRef.current.play().catch(() => undefined)
      else audioRef.current.pause()
    }
  }, [enabled])
}

export default function App() {
  const [view, setView] = useState<View>('role')
  const [student, setStudent] = useState<StudentState | null>(null)
  const studentRef = useRef<StudentState | null>(null)
  const [students, setStudents] = useState<Record<string, PlayerPresence>>({})
  const [raceStatus, setRaceStatus] = useState<RaceStatus>('lobby')
  const [race, setRace] = useState<StudentRace | null>(null)
  const [soundOn, setSoundOn] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const localStudentsRef = useRef<Record<string, PlayerPresence>>({})
  const sessionId = useMemo(() => sessionStorage.getItem('logaracing-session') ?? (() => { const id = `LOGA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`; sessionStorage.setItem('logaracing-session', id); return id })(), [])
  useSynthTheme(soundOn && view === 'teacher-dashboard')

  useEffect(() => { studentRef.current = student }, [student])

  const mergePresence = useCallback((state: Record<string, unknown>) => {
    const next: Record<string, PlayerPresence> = {}
    Object.values(state).flatMap(value => Array.isArray(value) ? value : []).forEach((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return
      const candidate = entry as Partial<PlayerPresence>
      if (candidate.playerId && candidate.name) next[candidate.playerId] = candidate as PlayerPresence
    })
    setStudents(next)
    localStudentsRef.current = next
  }, [])

  const broadcastProgress = useCallback(async (payload: PlayerPresence) => {
    if (channelRef.current) await channelRef.current.track(payload)
    else {
      localStudentsRef.current = { ...localStudentsRef.current, [payload.playerId]: payload }
      setStudents(localStudentsRef.current)
    }
    await recordPlayer({ sessionId, playerId: payload.playerId, name: payload.name, color: payload.color })
  }, [sessionId])

  const startStudentRace = useCallback((seed: number) => {
    const plan = shuffle(QUESTIONS, seed).slice(0, 10)
    setRace({ plan, initialIndex: 0, replayQueue: [], replayIndex: 0, pendingWrong: [], phase: 'initial', current: plan[0], score: 0, answered: 0, finished: false, lastWasCorrect: null })
    setRaceStatus('racing')
    setView('race')
  }, [])

  const ensureChannel = useCallback(async (forTeacher = false) => {
    if (!supabase || channelRef.current) return
    const channel = supabase.channel(ROOM, { config: { presence: { key: forTeacher ? `teacher-${crypto.randomUUID()}` : studentRef.current?.playerId ?? makePlayerId() } } })
      .on('presence', { event: 'sync' }, () => mergePresence(channel.presenceState()))
      .on('presence', { event: 'join' }, () => mergePresence(channel.presenceState()))
      .on('presence', { event: 'leave' }, () => mergePresence(channel.presenceState()))
      .on('broadcast', { event: 'race-start' }, ({ payload }) => { if (studentRef.current && payload?.seed) startStudentRace(Number(payload.seed)) })
      .on('broadcast', { event: 'race-stop' }, () => { setRaceStatus('finished'); setRace(current => current ? { ...current, current: null } : current) })
      .subscribe()
    channelRef.current = channel
    await new Promise<void>(resolve => window.setTimeout(resolve, 260))
    if (!forTeacher && studentRef.current) await broadcastProgress(studentRef.current)
  }, [broadcastProgress, mergePresence, startStudentRace])

  useEffect(() => () => { channelRef.current?.unsubscribe(); channelRef.current = null }, [])

  const studentList = useMemo(() => Object.values(students).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)), [students])

  const enterStudent = async (profile: StudentState) => {
    setStudent(profile)
    studentRef.current = profile
    setView('student-dashboard')
    await ensureChannel(false)
  }

  const enterTeacher = async () => { setView('teacher-dashboard'); await ensureChannel(true) }

  const startRace = async () => {
    const seed = Date.now() / 2_147_483_647
    setRaceStatus('racing')
    await upsertSession(sessionId, new Date().toISOString())
    if (channelRef.current) await channelRef.current.send({ type: 'broadcast', event: 'race-start', payload: { seed } })
    Object.values(localStudentsRef.current).forEach(player => { if (player.ready) startStudentRace(seed) })
  }

  const stopRace = async () => {
    setRaceStatus(prev => prev === 'racing' ? 'finished' : 'lobby')
    setRace(null)
    setStudents({})
    localStudentsRef.current = {}
    if (channelRef.current) await channelRef.current.send({ type: 'broadcast', event: 'race-stop', payload: {} })
    if (raceStatus === 'finished') await upsertSession(sessionId)
  }

  const answerQuestion = async (index: number) => {
    setRace(previous => {
      if (!previous || !previous.current || previous.finished) return previous
      const current = previous.current
      const isCorrect = index === current.answer
      const score = previous.score + (isCorrect ? 1 : 0)
      const answered = previous.answered + 1
      const pendingWrong = isCorrect ? previous.pendingWrong : [...previous.pendingWrong, current]
      const finish = score >= 10
      const nextStudent = studentRef.current ? { ...studentRef.current, score, answered, finished: finish, onlineAt: new Date().toISOString() } : null
      if (nextStudent) {
        studentRef.current = nextStudent
        setStudent(nextStudent)
        void broadcastProgress(nextStudent)
      }
      if (finish) return { ...previous, score, answered, finished: true, current: null, pendingWrong, lastWasCorrect: isCorrect }
      if (previous.phase === 'initial') {
        const nextIndex = previous.initialIndex + 1
        if (nextIndex < previous.plan.length) return { ...previous, score, answered, initialIndex: nextIndex, current: previous.plan[nextIndex], pendingWrong, lastWasCorrect: isCorrect }
        const replayQueue = dedupeQuestions(pendingWrong)
        if (replayQueue.length > 0) return { ...previous, score, answered, phase: 'replay', replayQueue, replayIndex: 0, pendingWrong: [], current: replayQueue[0], lastWasCorrect: isCorrect }
      } else {
        const nextReplayIndex = previous.replayIndex + 1
        if (nextReplayIndex < previous.replayQueue.length) return { ...previous, score, answered, replayIndex: nextReplayIndex, current: previous.replayQueue[nextReplayIndex], pendingWrong, lastWasCorrect: isCorrect }
        const replayQueue = dedupeQuestions(pendingWrong)
        if (replayQueue.length > 0) return { ...previous, score, answered, replayQueue, replayIndex: 0, pendingWrong: [], current: replayQueue[0], lastWasCorrect: isCorrect }
      }
      return { ...previous, score, answered, finished: true, current: null, lastWasCorrect: isCorrect }
    })
  }

  useEffect(() => {
    if (view !== 'teacher-dashboard' || raceStatus !== 'racing') return
    if (studentList.filter(item => item.finished).length >= 10) {
      void (async () => {
        if (channelRef.current) await channelRef.current.send({ type: 'broadcast', event: 'race-stop', payload: {} })
        setRaceStatus('finished')
      })()
    }
  }, [raceStatus, studentList, view])

  if (view === 'role') return <RoleScreen onStudent={() => setView('student-login')} onTeacher={() => setView('teacher-login')} />
  if (view === 'teacher-login') return <TeacherLogin onBack={() => setView('role')} onSuccess={enterTeacher} />
  if (view === 'student-login') return <StudentLogin onBack={() => setView('role')} onReady={enterStudent} />
  if (view === 'teacher-dashboard') return <TeacherDashboard students={studentList} raceStatus={raceStatus} onStart={startRace} onStop={stopRace} onLogout={() => { sessionStorage.removeItem('logaracing-teacher'); setView('role'); setRaceStatus('lobby') }} soundOn={soundOn} onSoundToggle={() => setSoundOn(value => !value)} />
  if (view === 'student-dashboard' && student) return <StudentDashboard student={student} students={studentList} raceStatus={raceStatus} onLeave={() => { setView('role'); setStudent(null); studentRef.current = null }} />
  if (view === 'race' && student && race) return <Cockpit student={student} race={race} onAnswer={answerQuestion} onExit={() => setView('student-dashboard')} />
  return <RoleScreen onStudent={() => setView('student-login')} onTeacher={() => setView('teacher-login')} />
}

function dedupeQuestions(items: Question[]) {
  const seen = new Set<string>()
  return items.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true })
}
