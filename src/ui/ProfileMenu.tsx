import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { authAPI } from "../lib/auth-api";

export default function ProfileMenu({ onRegisterSchool }: { onRegisterSchool?: () => void }) {
  const { user, tokens, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<any>(user ?? null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  const toggle = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && tokens?.IdToken) {
      setLoading(true); setErr("");
      try { setProfile(await authAPI.getProfile(tokens.IdToken)); }
      catch { setErr("Couldn’t load profile"); }
      finally { setLoading(false); }
    }
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => { if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
  const fields = [
    { label: "Name", value: fullName || undefined },
    { label: "Email", value: profile?.email },
    { label: "Role", value: profile?.role },
    { label: "Grade", value: profile?.grade },
    { label: "School", value: profile?.school ?? profile?.schoolName },
  ].filter(f => f.value);

  const isInstructor = (profile?.role ?? user?.role ?? "").toLowerCase() === "instructor";
  const hasSchool = !!(profile?.school ?? profile?.schoolName);

  return (
    <div className="relative" ref={ref}>
      <button className="dashboard-logout-btn" onClick={toggle} aria-haspopup="menu" aria-expanded={open} title="Profile">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>
        <span>Profile</span>
      </button>

      {open && (
        <div role="menu" aria-label="Profile menu" style={{
          position:"absolute", right:0, marginTop:8, width:"min(320px,92vw)",
          background:"var(--card)", border:"2px solid rgba(139,124,249,.35)", borderRadius:14,
          boxShadow:"0 18px 60px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.04)", padding:12, zIndex:60, color:"#e9f2ff"
        }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontWeight:800,fontSize:16}}>Profile</div>
            <button onClick={() => setOpen(false)} className="dash-icon-btn" aria-label="Close">✕</button>
          </div>

          {loading ? (
            <div className="text-slate-300" style={{display:"flex",gap:8,alignItems:"center"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              Loading profile…
            </div>
          ) : err ? (
            <div className="rounded-xl border border-red-700/50 bg-red-900/30 p-3 text-red-200">{err}</div>
          ) : (
            <div style={{display:"grid",gap:8}}>
              {fields.length ? fields.map(f => (
                <div key={f.label} style={{display:"flex",justifyContent:"space-between",gap:12,
                  border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.03)", borderRadius:10, padding:"8px 10px", fontSize:14}}>
                  <span style={{color:"var(--muted)"}}>{f.label}</span>
                  <span style={{color:"#fff",fontWeight:600,textAlign:"right"}}>{String(f.value)}</span>
                </div>
              )) : <div className="text-slate-300">No profile info available.</div>}
            </div>
          )}

          <div style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:12}}>
            {isInstructor && !hasSchool && (
              <button className="dash-cta" style={{height:38,padding:"0 12px"}} onClick={() => { setOpen(false); onRegisterSchool?.(); }}>
                Register school
              </button>
            )}
            <div style={{flex:1}} />
            <button onClick={logout} className="dash-ghost" style={{height:38,padding:"0 12px"}}>Logout</button>
          </div>
        </div>
      )}
    </div>
  );
}
