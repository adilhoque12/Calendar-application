import { useState, useEffect, useRef } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const CATEGORY_COLORS = {
  work: { bg: "#E6F1FB", text: "#0C447C", dot: "#378ADD" },
  personal: { bg: "#EAF3DE", text: "#3B6D11", dot: "#639922" },
  health: { bg: "#FAEEDA", text: "#854F0B", dot: "#BA7517" },
  social: { bg: "#FBEAF0", text: "#72243E", dot: "#D4537E" },
  other: { bg: "#F1EFE8", text: "#5F5E5A", dot: "#888780" },
};

function toKey(year, month, day) {
  return `act:${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

export default function CalendarApp() {
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(null);
  const [activities, setActivities] = useState({});
  const [input, setInput] = useState("");
  const [category, setCategory] = useState("personal");
  const [loaded, setLoaded] = useState(false);
  const [dotDates, setDotDates] = useState({});
  const inputRef = useRef();

  useEffect(() => {
    async function load() {
      try {
        const keys = await window.storage.list("act:");
        const entries = {};
        for (const k of (keys?.keys || [])) {
          try {
            const r = await window.storage.get(k);
            if (r) entries[k] = JSON.parse(r.value);
          } catch {}
        }
        setActivities(entries);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const dots = {};
    for (const k of Object.keys(activities)) {
      if (activities[k]?.length > 0) dots[k] = true;
    }
    setDotDates(dots);
  }, [activities]);

  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const prevMonth = () => setView(v => {
    const d = new Date(v.year, v.month - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const nextMonth = () => setView(v => {
    const d = new Date(v.year, v.month + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const selectDay = (day) => {
    setSelected({ year: view.year, month: view.month, day });
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const selectedKey = selected ? toKey(selected.year, selected.month, selected.day) : null;
  const selectedActs = selectedKey ? (activities[selectedKey] || []) : [];

  const addActivity = async () => {
    const txt = input.trim();
    if (!txt || !selectedKey) return;
    const newAct = { id: Date.now(), text: txt, category, done: false };
    const updated = [...selectedActs, newAct];
    setActivities(prev => ({ ...prev, [selectedKey]: updated }));
    setInput("");
    try { await window.storage.set(selectedKey, JSON.stringify(updated)); } catch {}
    inputRef.current?.focus();
  };

  const toggleDone = async (id) => {
    if (!selectedKey) return;
    const updated = selectedActs.map(a => a.id === id ? { ...a, done: !a.done } : a);
    setActivities(prev => ({ ...prev, [selectedKey]: updated }));
    try { await window.storage.set(selectedKey, JSON.stringify(updated)); } catch {}
  };

  const deleteAct = async (id) => {
    if (!selectedKey) return;
    const updated = selectedActs.filter(a => a.id !== id);
    setActivities(prev => ({ ...prev, [selectedKey]: updated }));
    try { await window.storage.set(selectedKey, JSON.stringify(updated)); } catch {}
  };

  const isToday = (day) => day === today.getDate() && view.month === today.getMonth() && view.year === today.getFullYear();
  const isSelected = (day) => selected && selected.day === day && selected.month === view.month && selected.year === view.year;

  const selectedLabel = selected
    ? `${MONTHS[selected.month]} ${selected.day}, ${selected.year}`
    : null;

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ fontFamily: "'Georgia', serif", padding: "1.5rem 1rem", maxWidth: 700, margin: "0 auto" }}>
      <h2 className="sr-only">Calendar and activity tracker</h2>

      <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
        {/* Calendar */}
        <div style={{ flex: "1 1 320px", minWidth: 300 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <button onClick={prevMonth} style={{ background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 14, color: "var(--color-text-secondary)" }}>←</button>
            <span style={{ fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)", letterSpacing: "0.02em" }}>
              {MONTHS[view.month]} {view.year}
            </span>
            <button onClick={nextMonth} style={{ background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 14, color: "var(--color-text-secondary)" }}>→</button>
          </div>

          {/* Day labels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "var(--font-sans)", letterSpacing: "0.06em", padding: "2px 0" }}>{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const k = toKey(view.year, view.month, day);
              const hasDot = dotDates[k];
              const todayDay = isToday(day);
              const selDay = isSelected(day);
              return (
                <button
                  key={day}
                  onClick={() => selectDay(day)}
                  style={{
                    position: "relative",
                    background: selDay ? "var(--color-text-primary)" : todayDay ? "var(--color-background-secondary)" : "transparent",
                    border: selDay ? "none" : todayDay ? "1.5px solid var(--color-border-primary)" : "0.5px solid var(--color-border-tertiary)",
                    borderRadius: "var(--border-radius-md)",
                    padding: "8px 4px 10px",
                    cursor: "pointer",
                    fontFamily: "'Georgia', serif",
                    fontSize: 14,
                    fontWeight: todayDay ? 500 : 400,
                    color: selDay ? "var(--color-background-primary)" : "var(--color-text-primary)",
                    transition: "all 0.15s",
                    textAlign: "center",
                  }}
                >
                  {day}
                  {hasDot && (
                    <span style={{
                      position: "absolute",
                      bottom: 3,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: selDay ? "var(--color-background-primary)" : "#378ADD",
                      opacity: selDay ? 0.7 : 1,
                      display: "block",
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ marginTop: "1.25rem", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(CATEGORY_COLORS).map(([cat, c]) => (
              <span key={cat} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "var(--font-sans)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, display: "inline-block" }} />
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Activity Panel */}
        <div style={{ flex: "1 1 280px", minWidth: 260 }}>
          {!selected ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)", fontSize: 14, fontFamily: "var(--font-sans)", textAlign: "center", padding: "2rem 1rem", border: "0.5px dashed var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)" }}>
              Select a date to view<br />or add activities
            </div>
          ) : (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
              <div style={{ marginBottom: "1rem", borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: "0.75rem" }}>
                <div style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)" }}>{selectedLabel}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontFamily: "var(--font-sans)", marginTop: 2 }}>{selectedActs.length} {selectedActs.length === 1 ? "activity" : "activities"}</div>
              </div>

              {/* Add input */}
              <div style={{ marginBottom: "1rem" }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addActivity()}
                  placeholder="Add an activity..."
                  style={{ width: "100%", boxSizing: "border-box", marginBottom: 8, fontFamily: "'Georgia', serif", fontSize: 13 }}
                />
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <select value={category} onChange={e => setCategory(e.target.value)} style={{ flex: 1, fontFamily: "var(--font-sans)", fontSize: 12 }}>
                    {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={addActivity} style={{ padding: "6px 14px", fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer", background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", whiteSpace: "nowrap" }}>Add</button>
                </div>
              </div>

              {/* List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {selectedActs.length === 0 && (
                  <div style={{ fontSize: 13, color: "var(--color-text-tertiary)", fontFamily: "var(--font-sans)", textAlign: "center", padding: "1rem 0" }}>No activities yet</div>
                )}
                {selectedActs.map(act => {
                  const col = CATEGORY_COLORS[act.category] || CATEGORY_COLORS.other;
                  return (
                    <div key={act.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", background: act.done ? "var(--color-background-secondary)" : col.bg, borderRadius: "var(--border-radius-md)", border: `0.5px solid ${col.dot}22`, opacity: act.done ? 0.65 : 1, transition: "all 0.15s" }}>
                      <input type="checkbox" checked={act.done} onChange={() => toggleDone(act.id)} style={{ marginTop: 2, cursor: "pointer", accentColor: col.dot, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: act.done ? "var(--color-text-tertiary)" : col.text, textDecoration: act.done ? "line-through" : "none", wordBreak: "break-word", fontFamily: "'Georgia', serif" }}>{act.text}</div>
                        <div style={{ fontSize: 10, color: col.dot, fontFamily: "var(--font-sans)", marginTop: 2, letterSpacing: "0.05em" }}>{act.category}</div>
                      </div>
                      <button onClick={() => deleteAct(act.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 14, padding: "0 2px", lineHeight: 1, flexShrink: 0 }}>×</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
