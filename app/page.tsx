"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { BarChart3, CircleHelp, Download, Eye, EyeOff, History, Palette, RefreshCw, X } from "lucide-react";
import { CuberMark } from "./cuber-mark";
import { EdgeHandle } from "./edge-handle";
import { CopyIcon, CubeNet, ScrambleMoves, useScrambleDisplay } from "./scramble-display";
import { SessionStats } from "./session-stats";
import { SolveActions } from "./solve-actions";
import { average, effective, exportSolves, summarize, time, type Penalty, type Solve } from "../lib/solves";
import { useTimer } from "../lib/use-timer";

const accents = ["Neutral", "Blue", "Violet", "Rose", "Amber", "Teal", "Chroma"] as const;
type Accent = typeof accents[number];
type Preferences = { accent: Accent; theme: "light" | "dark"; hide: boolean; chromaRange: number; chromaSpeed: number; history?: boolean; hasSolved?: boolean };
const defaults: Preferences = { accent: "Neutral", theme: "light", hide: false, chromaRange: 165, chromaSpeed: 1 };
const solveKey = "turnform.solves.v1";
const settingsKey = "turnform.preferences.v1";

export default function Home() {
  const [solves, setSolves] = useState<Solve[]>([]);
  const [preferences, setPreferences] = useState(defaults);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [{ current: scramble, previous: previousScramble }, setScramble] = useState({ current: "", previous: "" });
  const { moves, shuffledMoves, shuffledFaces } = useScrambleDisplay(scramble, !!previousScramble);
  const [scrambleState, setScrambleState] = useState<"loading" | "ready" | "error">("loading");
  const [copied, setCopied] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [solveFlash, setSolveFlash] = useState<{ id: string; difference: number } | null>(null);
  const [deleted, setDeleted] = useState<{ solve: Solve; index: number } | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [compact, setCompact] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const modal = useRef<HTMLDialogElement>(null);
  const accentPicker = useRef<HTMLDivElement>(null);
  const timerTarget = useRef<HTMLButtonElement>(null);
  const historyList = useRef<HTMLOListElement>(null);
  const scrollIdle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const initial = useRef(false);
  const generating = useRef(false);
  const activeSolve = solves.find(solve => solve.id === selected);
  const stats = useMemo(() => summarize(solves), [solves]);
  const historyOpen = Boolean(preferences.history) && !(compact && statsOpen);
  const latest = solves[0];
  const showIntro = loaded && !preferences.hasSolved && !solves.length;
  const rollingAo5 = useMemo(() => solves.map((_, index) => average(solves, 5, index)), [solves]);

  const updateHistoryFade = useCallback((list: HTMLOListElement) => {
    list.style.setProperty("--history-scroll", `${list.scrollTop}px`);
    setHistoryHasMore(list.scrollHeight - list.clientHeight - list.scrollTop > 1);
  }, []);

  const onHistoryScroll = (list: HTMLOListElement) => {
    updateHistoryFade(list);
    list.dataset.scrolling = "true";
    clearTimeout(scrollIdle.current);
    scrollIdle.current = setTimeout(() => delete list.dataset.scrolling, 1000);
  };

  useEffect(() => () => clearTimeout(scrollIdle.current), []);

  const positionRowActions = (row: HTMLLIElement) => {
    row.style.setProperty("--row-center", `${row.offsetTop + row.offsetHeight / 2}px`);
  };

  useEffect(() => {
    const list = historyList.current;
    if (!list) return;
    const update = () => updateHistoryFade(list);
    const observer = new ResizeObserver(update);
    observer.observe(list);
    update();
    return () => observer.disconnect();
  }, [historyOpen, solves.length, updateHistoryFade]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1050px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.accent = preferences.accent;
    document.documentElement.style.setProperty("--chroma-range", `${preferences.chromaRange}deg`);
    document.documentElement.style.setProperty("--chroma-duration", `${16 / preferences.chromaSpeed}s`);
  }, [preferences.accent, preferences.theme, preferences.chromaRange, preferences.chromaSpeed]);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(solveKey) ?? "[]");
      if (Array.isArray(saved)) setSolves(saved.filter((item): item is Solve =>
        item && typeof item.id === "string" && Number.isFinite(item.ms) && item.ms >= 0 &&
        typeof item.scramble === "string" && Number.isFinite(item.date) &&
        ["none", "+2", "DNF"].includes(item.penalty) && typeof item.note === "string"));
    } catch { setStorageError(true); }
    try {
      const saved = JSON.parse(localStorage.getItem(settingsKey) ?? "null");
      setPreferences({
        accent: accents.find(accent => accent === saved?.accent) ?? defaults.accent,
        chromaRange: Number.isFinite(saved?.chromaRange) ? Math.min(330, Math.max(30, saved.chromaRange)) : defaults.chromaRange,
        chromaSpeed: Number.isFinite(saved?.chromaSpeed) ? Math.min(3, Math.max(.25, saved.chromaSpeed)) : defaults.chromaSpeed,
        theme: saved?.theme === "dark" || saved?.theme === "ink" ? "dark" : "light",
        hide: saved?.hide === true,
        history: typeof saved?.history === "boolean" ? saved.history : window.matchMedia("(min-width: 1051px)").matches,
        hasSolved: saved?.hasSolved === true,
      });
    } catch { setStorageError(true); }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(solveKey, JSON.stringify(solves));
      localStorage.setItem(settingsKey, JSON.stringify(preferences));
      setStorageError(false);
    } catch { setStorageError(true); }
  }, [loaded, solves, preferences]);

  const nextScramble = useCallback(async () => {
    if (generating.current) return;
    generating.current = true;
    setScrambleState("loading");
    try {
      const response = await fetch("/api/scramble", { cache: "no-store" });
      if (!response.ok) throw new Error("Scramble service unavailable");
      const { scramble } = await response.json() as { scramble: string };
      setScramble(({ current }) => ({ current: scramble, previous: current }));
      setScrambleState("ready");
    } catch (error) {
      console.error("Scramble generation failed", error);
      setScrambleState("error");
    } finally {
      generating.current = false;
    }
  }, []);

  useEffect(() => {
    if (initial.current) return;
    initial.current = true;
    void nextScramble();
  }, [nextScramble]);

  useEffect(() => {
    if (panelOpen && modal.current && !modal.current.open) {
      modal.current.scrollTop = 0;
      modal.current.showModal();
    }
  }, [panelOpen]);

  useEffect(() => () => clearTimeout(copyTimeout.current), []);

  const finish = useCallback((ms: number) => {
    const solve: Solve = { id: crypto.randomUUID(), ms, scramble, date: Date.now(), penalty: "none", note: "" };
    const previous = latest ? effective(latest) : Infinity;
    const difference = (Math.floor(ms / 10) - Math.floor(previous / 10)) * 10;
    setSolveFlash(Number.isFinite(difference) && difference !== 0 ? { id: solve.id, difference } : null);
    setSolves(previous => [solve, ...previous]);
    setPreferences(previous => ({ ...previous, hasSolved: true }));
    setDeleted(null);
    setHelpOpen(false);
    void nextScramble();
  }, [latest, scramble, nextScramble]);

  const { phase, elapsed, press, release, cancel, activate } = useTimer(loaded && scrambleState === "ready" && !panelOpen, finish);
  const busy = phase !== "idle";
  const running = phase === "running";

  useEffect(() => {
    if (busy) setSolveFlash(null);
    if (busy && accentPicker.current?.matches(":popover-open")) accentPicker.current.hidePopover();
  }, [busy]);

  const focusTimer = () => timerTarget.current?.focus({ preventScroll: true });
  const updateSolve = (id: string, patch: Partial<Solve>) =>
    setSolves(items => items.map(item => item.id === id ? { ...item, ...patch } : item));
  const openSolve = (solveId: string) => {
    setSelected(solveId);
    setConfirmDelete(false);
    setPanelOpen(true);
  };
  const toggleHistory = () => {
    setPreferences(previous => ({ ...previous, history: !historyOpen }));
    if (!historyOpen && compact) setStatsOpen(false);
    focusTimer();
  };
  const toggleStats = () => {
    setStatsOpen(value => !value);
    focusTimer();
  };
  const togglePenalty = (solve: Solve, penalty: Penalty) => {
    updateSolve(solve.id, { penalty: solve.penalty === penalty ? "none" : penalty });
    if (!compact || !historyOpen) focusTimer();
  };
  const deleteSolve = (solve: Solve) => {
    setDeleted({ solve, index: solves.indexOf(solve) });
    setPreferences(previous => ({ ...previous, hasSolved: true }));
    setSolves(items => items.filter(item => item.id !== solve.id));
    if (!compact || !historyOpen) focusTimer();
  };
  const undoDelete = () => {
    if (!deleted) return;
    const { solve, index } = deleted;
    setSolves(items => items.toSpliced(index, 0, solve));
    setDeleted(null);
    if (!compact || !historyOpen) focusTimer();
  };

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
    } catch {
      setCopied("");
    }
    clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(""), 2000);
  }

  const display = running ? preferences.hide ? "Solving" : time(elapsed) : time(latest ? effective(latest) : 0);
  const [whole, fraction] = display.split(".");
  const prompt = phase === "holding" ? "Release to start" : running ? "Press to stop" :
    showIntro && scrambleState === "ready" ? "Ready to solve" : "";

  return (
    <div className="app-shell" data-phase={phase} data-side-open={historyOpen || statsOpen}>
      <header className="topbar fade-during-solve flex items-center justify-between" inert={busy}>
        <h1 className="brand flex items-center gap-2.5"><CuberMark /> Cuber</h1>
        <div className="flex items-center gap-1">
          <div className="help-anchor" onKeyDown={event => {
            if (event.key === "Escape") { setHelpOpen(false); focusTimer(); }
          }}>
            <button className="icon-button help-trigger" aria-label="How to use Cuber" aria-describedby="timer-help" aria-expanded={helpOpen}
              onMouseDown={event => event.preventDefault()} onClick={() => setHelpOpen(value => !value)}>
              <CircleHelp size={17} />
            </button>
            <div id="timer-help" className="help-tooltip" role="tooltip" data-open={helpOpen}>
              <p>Press and release <kbd>Space</kbd> to start. Press it again to stop.</p>
              <p>You can also press and release the timer itself.</p>
            </div>
          </div>
          <button className="icon-button accent-trigger" aria-label="Color theme" title="Color theme" popoverTarget="accent-picker">
            <Palette size={17} />
          </button>
          <div ref={accentPicker} id="accent-picker" className="accent-picker" popover="auto">
            <h2>Color theme</h2>
            <div className="segmented theme-options" aria-label="Appearance">
              {(["light", "dark"] as const).map(theme => <button key={theme} aria-pressed={preferences.theme === theme}
                onClick={() => setPreferences(previous => ({ ...previous, theme }))}>{theme}</button>)}
            </div>
            <div className="swatch-list">
              {accents.map(accent => <button key={accent} className="accent-swatch" data-swatch={accent}
                aria-label={accent} title={accent} aria-pressed={preferences.accent === accent} onClick={() => {
                  setPreferences(previous => ({ ...previous, accent }));
                  if (accent === "Chroma") return;
                  accentPicker.current?.hidePopover();
                  focusTimer();
                }}><span /></button>)}
            </div>
            {preferences.accent === "Chroma" && <div className="chroma-controls">
              <label><span>Gradient range <output>{preferences.chromaRange}°</output></span>
                <input type="range" aria-label="Gradient range" aria-valuetext={`${preferences.chromaRange} degrees`}
                  min="30" max="330" step="5" value={preferences.chromaRange}
                  onChange={event => setPreferences(previous => ({ ...previous, chromaRange: event.target.valueAsNumber }))} />
              </label>
              <label><span>Speed <output>{preferences.chromaSpeed}×</output></span>
                <input type="range" aria-label="Speed" aria-valuetext={`${preferences.chromaSpeed} times`}
                  min=".25" max="3" step=".25" value={preferences.chromaSpeed}
                  onChange={event => setPreferences(previous => ({ ...previous, chromaSpeed: event.target.valueAsNumber }))} />
              </label>
            </div>}
          </div>
          <button className="icon-button" aria-label="Show time while solving" aria-pressed={!preferences.hide}
            title={preferences.hide ? "Show time while solving" : "Hide time while solving"} onClick={() => {
              setPreferences(previous => ({ ...previous, hide: !previous.hide }));
              focusTimer();
            }}>
            {preferences.hide ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </header>

      <main className="workspace">
        <span className="sr-only" role="status">
          {solveFlash && `${time(Math.abs(solveFlash.difference))} ${solveFlash.difference < 0 ? "faster" : "slower"}`}
        </span>
        {!busy && solveFlash && (
          <span key={solveFlash.id} className="solve-flash" data-faster={solveFlash.difference < 0}
            aria-hidden="true" onAnimationEnd={event => {
              if (event.animationName === "solve-fade") setSolveFlash(null);
            }}>
            {solveFlash.difference < 0 ? "−" : "+"}{time(Math.abs(solveFlash.difference))}
          </span>
        )}
        <section className="practice" aria-label="3×3 timer">
          <div className="practice-top fade-during-solve" inert={busy}>
            <div className="scramble-block">
              <div className="scramble-heading flex items-center gap-3">
                <h2 className="scramble-label">3×3 scramble</h2>
                <div className="scramble-actions flex items-center gap-1" onMouseDown={event => event.preventDefault()}>
                  <button className="icon-button small" disabled={busy || scrambleState !== "ready"} aria-label={copied === scramble && scramble ? "Copied" : "Copy scramble"} title="Copy scramble" onClick={() => void copy(scramble)}><CopyIcon copied={!!scramble && copied === scramble} /></button>
                  <button className="icon-button small" disabled={busy || scrambleState === "loading"} aria-label="New scramble" title="New scramble" onClick={() => void nextScramble()}><RefreshCw size={15} /></button>
                </div>
              </div>
              <div className="scramble-text" aria-live="polite" aria-busy={scrambleState === "loading"} data-loading={scrambleState === "loading" && !!scramble}>
                {scrambleState === "error" ? <button className="retry" onClick={() => void nextScramble()}>Couldn’t generate a scramble. Retry</button> :
                  scramble ? <ScrambleMoves scramble={scramble} moves={moves} shuffled={shuffledMoves} /> :
                    <span className="scramble-loading">Generating scramble…</span>}
              </div>
            </div>
          </div>

          <div className="timer-space">
            <button ref={timerTarget} type="button" className="timer-target"
              aria-label={running ? "Stop timer" : "Press and release to start timer"} aria-disabled={scrambleState !== "ready" && !running}
              onPointerDown={event => {
                if (event.button !== 0 || !event.isPrimary) return;
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                press("pointer");
              }}
              onPointerUp={event => { if (event.isPrimary) release("pointer"); }} onPointerCancel={cancel} onLostPointerCapture={cancel} onBlur={cancel}
              onKeyDown={event => {
                if ((event.code === "Space" || event.code === "Enter") && !event.repeat) {
                  event.preventDefault();
                  press("keyboard");
                }
              }}
              onKeyUp={event => {
                if (event.code === "Space" || event.code === "Enter") {
                  event.preventDefault();
                  release("keyboard");
                }
              }}
              onClick={event => {
                if (event.detail !== 0) return;
                activate();
              }}>
              <span className="timer-readout" data-result={!!latest && latest.penalty !== "DNF"} data-word={fraction === undefined} data-long={whole.length > 3}>{whole}{fraction !== undefined && <span className="timer-decimal">.{fraction}</span>}</span>
            </button>
            <div className="timer-support">
              <span className="timer-status" aria-live="polite">{prompt}</span>
              <div className="solve-actions fade-during-solve" inert={busy}>
                {deleted ? <button className="text-button" onClick={undoDelete}>Undo delete</button> : latest ?
                  <SolveActions solve={latest} onDelete={deleteSolve} onPenalty={togglePenalty} last /> : showIntro ? <>
                  <span className="keyboard-hint"><kbd>Space</kbd> Press and release to start</span>
                  <span className="touch-hint">Touch and release to start</span>
                </> : null}
              </div>
            </div>
          </div>
        </section>

        <div className="corner-tools fade-during-solve" inert={busy}>
          <button className="cube-preview" aria-label="Generate a new scramble from the cube preview" title="New scramble"
            disabled={busy || scrambleState === "loading"} onMouseDown={event => event.preventDefault()} onClick={() => {
              void nextScramble();
              focusTimer();
            }}>
            {scramble && <CubeNet scramble={scramble} displayFaces={shuffledFaces} />}
          </button>
          <section className="session" aria-label="Session summary" data-hidden={statsOpen} inert={statsOpen}>
            <dl className="metric-grid">
              {([["Ao5", stats.ao5], ["Ao12", stats.ao12], ["Mean", stats.mean], ["Best single", stats.best]] as const).map(([label, value]) => (
                <div className="metric" key={label}><dt>{label}</dt><dd data-empty={value === null}>{time(value)}</dd></div>
              ))}
            </dl>
          </section>
        </div>
        <aside id="solve-history" className="side-panel history-rail fade-during-solve" aria-label="Solve history"
          data-open={historyOpen} data-more={solves.length > 0 && historyHasMore} inert={busy || !historyOpen}
          style={{ "--solve-digits": String(solves.length).length } as CSSProperties}>
          <div className="history-head">
            <h2>Solves</h2>
            <div className="flex items-center gap-1">
              {solves.length > 0 && <button className="icon-button small floating-icon" aria-label="Export solves as CSV" title="Export CSV" onClick={() => { exportSolves(solves); focusTimer(); }}><Download size={14} /></button>}
              <button className="icon-button small floating-icon" aria-label="Hide solve history" title="Hide solve history" onClick={toggleHistory}><X size={15} /></button>
            </div>
          </div>
          <div className="history-columns"><span aria-hidden="true" /><span>Time</span><span>Ao5</span></div>
          {solves.length ? <ol ref={historyList} className="rail-list" onScroll={event => onHistoryScroll(event.currentTarget)}>
            {solves.map((solve, index) => (
            <li key={solve.id} onPointerEnter={event => positionRowActions(event.currentTarget)}
              onFocusCapture={event => positionRowActions(event.currentTarget)}>
              <button className="history-result" onClick={() => openSolve(solve.id)}>
                <span className="solve-index">{solves.length - index}</span>
                <strong>{time(effective(solve))}{solve.penalty === "+2" && <sup>+</sup>}</strong>
                <span>{time(rollingAo5[index])}</span>
              </button>
              <div className="row-actions" role="group" aria-label={`Actions for solve ${solves.length - index}`}>
                <SolveActions solve={solve} onDelete={deleteSolve} onPenalty={togglePenalty} />
              </div>
            </li>
          ))}</ol> : <p className="recent-empty">Your times will appear here.</p>}
        </aside>
        <aside id="detailed-stats" className="side-panel analytics-rail fade-during-solve" aria-label="Detailed stats"
          data-open={statsOpen} inert={busy || !statsOpen}>
          <div className="history-head">
            <h2>Analytics</h2>
            <button className="icon-button small floating-icon" aria-label="Hide analytics" title="Hide analytics" onClick={toggleStats}><X size={15} /></button>
          </div>
          <SessionStats solves={solves} stats={stats} />
        </aside>
        <nav aria-label="Session panels" inert={busy}>
          {!historyOpen && <EdgeHandle side="left" label="Solve history" controls="solve-history" icon={<History size={16} />} onToggle={toggleHistory} />}
          {!statsOpen && <EdgeHandle side="right" label="Detailed stats" controls="detailed-stats" icon={<BarChart3 size={16} />} onToggle={toggleStats} />}
        </nav>
        {storageError && <p className="storage-warning fade-during-solve" role="status">Local storage unavailable</p>}
      </main>

      <dialog ref={modal} className="dialog" aria-labelledby="dialog-title" onClose={() => {
        timerTarget.current?.focus({ preventScroll: true });
        setPanelOpen(false);
      }} onClick={event => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) modal.current?.close();
        }
      }}>
        <div className="dialog-head flex items-center justify-between gap-4">
          <h2 id="dialog-title">Solve details</h2>
          <button className="icon-button" aria-label="Close" onClick={() => modal.current?.close()}><X size={19} /></button>
        </div>
        {activeSolve && <div className="solve-detail">
          <div className="solve-time">
            <strong>{time(effective(activeSolve))}</strong>
            {activeSolve.penalty !== "none" && <span>({time(activeSolve.ms)})</span>}
          </div>
          <section className="detail-scramble" aria-label="Scramble">
            <p>{activeSolve.scramble}</p>
            <div className="detail-cube">
              <CubeNet scramble={activeSolve.scramble} />
              <button className="icon-button small" aria-label={copied === activeSolve.scramble ? "Copied" : "Copy solve scramble"}
                onClick={() => void copy(activeSolve.scramble)}><CopyIcon copied={copied === activeSolve.scramble} size={15} /></button>
            </div>
          </section>
          <div className="solve-result">
            {confirmDelete ? <div className="detail-actions">
              <span>Delete this solve?</span>
              <button className="text-button" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="text-button solve-action delete-action" onClick={() => {
                deleteSolve(activeSolve);
                modal.current?.close();
              }}>Delete</button>
            </div> : <div className="detail-actions" role="group" aria-label="Solve result">
              <SolveActions solve={activeSolve} onDelete={() => setConfirmDelete(true)}
                onPenalty={(solve, penalty) => updateSolve(solve.id, { penalty: solve.penalty === penalty ? "none" : penalty })} />
            </div>}
          </div>
          <label className="note-label">Notes
            <textarea placeholder="Add a note about this solve" value={activeSolve.note}
              onChange={event => updateSolve(activeSolve.id, { note: event.target.value })} />
          </label>
        </div>}
      </dialog>
    </div>
  );
}
