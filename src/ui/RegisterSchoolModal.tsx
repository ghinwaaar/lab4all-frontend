import React, { useState } from "react";
import { useAuth } from "../lib/auth-context";
import { schoolAPI } from "../lib/school-api";

export default function RegisterSchoolModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tokens, logout } = useAuth();
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [city, setCity] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState<{ schoolId: string; name: string } | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokens?.IdToken) return setErr("Not authenticated.");
    setLoading(true); setErr(""); setOk(null);
    try {
      const res = await schoolAPI.register(tokens.IdToken, {
        name: name.trim(),
        countryCode: countryCode.trim().toUpperCase(),
        city: city.trim(),
        schoolId: schoolId.trim() || undefined,
      });
      setOk({ schoolId: res.schoolId, name: res.name });
    } catch (e: any) {
      setErr(e?.message || "Failed to register school");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dash-modal-backdrop" onClick={onClose}>
      <div className="dash-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="dash-modal-head">
          <h3>Register School</h3>
          <button className="dash-icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {!ok ? (
          <>
            <p className="dash-modal-sub">Instructors can register their school and link it to their account.</p>
            {err && <div className="rounded-xl border border-red-700/50 bg-red-900/30 p-3 text-red-200" style={{marginBottom:10}}>{err}</div>}
            <form onSubmit={submit} style={{display:"grid",gap:10}}>
              <label style={{display:"grid",gap:6}}>
                <span style={{color:"var(--muted)"}}>School name</span>
                <input className="signup-input" value={name} onChange={e => setName(e.target.value)} placeholder="International College Beirut" required />
              </label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <label style={{display:"grid",gap:6}}>
                  <span style={{color:"var(--muted)"}}>Country code</span>
                  <input className="signup-input" value={countryCode} onChange={e => setCountryCode(e.target.value.toUpperCase())} placeholder="LB" maxLength={2} required />
                </label>
                <label style={{display:"grid",gap:6}}>
                  <span style={{color:"var(--muted)"}}>City</span>
                  <input className="signup-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Beirut" required />
                </label>
              </div>
              <label style={{display:"grid",gap:6}}>
                <span style={{color:"var(--muted)"}}>School ID (optional, slug). Leave empty to generate from name.</span>
                <input className="signup-input" value={schoolId} onChange={e => setSchoolId(e.target.value)} placeholder="international-college-beirut" />
              </label>
              <div className="dash-modal-foot">
                <button type="button" className="dash-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="dash-cta" disabled={loading}>{loading ? "Registering…" : "Register school"}</button>
              </div>
            </form>
          </>
        ) : (
          <>
            <p className="dash-modal-sub"><strong>{ok.name}</strong> registered successfully.</p>
            <div className="rounded-xl border border-slate-600/50 bg-slate-900/40 p-3">
              Please sign out and sign in again so your account picks up the new school link.
            </div>
            <div className="dash-modal-foot" style={{marginTop:10}}>
              <button className="dash-ghost" onClick={onClose}>Close</button>
              <button className="dash-cta" onClick={() => { onClose(); logout(); }}>Sign out now</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
