"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { BadgeCheck, KeyRound, Mail, Save, ShieldCheck, UserRound } from "lucide-react";
import { adminFetch } from "@/lib/auth/admin-client";
import type { AdminProfile } from "@/lib/db/types";

export default function AdminAccountPanel() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const response = await adminFetch("/api/admin/account");
    const data = await response.json() as { profile?: AdminProfile; message?: string };
    setProfile(data.profile || null);
    if (!response.ok) setMessage(data.message || "Could not load the Admin account.");
    setLoading(false);
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true); setMessage("");
    const response = await adminFetch("/api/admin/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: new FormData(event.currentTarget).get("displayName") }) });
    const data = await response.json() as { profile?: AdminProfile; message?: string };
    if (response.ok && data.profile) { setProfile(data.profile); setMessage("Admin profile updated."); } else setMessage(data.message || "Could not update the Admin profile.");
    setSaving(false);
  };
  if (loading) return <div className="admin-records-empty">Loading Admin account...</div>;
  if (!profile) return <div className="admin-records-empty">The Admin account could not be loaded.</div>;
  return <div className="admin-account">
    <section className="admin-account-identity"><span><UserRound size={24} /></span><div><p>SOLE AUTHORISED ACCOUNT</p><h2>{profile.displayName}</h2><small><Mail size={13} />{profile.email}</small></div><em><BadgeCheck size={14} />Primary Admin</em></section>
    <div className="admin-account-grid"><form className="admin-settings-card" onSubmit={save}><div className="admin-settings-heading"><span><UserRound size={17} /></span><div><p>PROFILE</p><h2>Account details</h2></div></div><label className="admin-account-field">Admin display name<input name="displayName" required defaultValue={profile.displayName} /></label><label className="admin-account-field">Sign-in email<input value={profile.email} readOnly aria-readonly="true" /></label><p className="admin-settings-muted">Email and role are protected by the single-Admin policy. Use Supabase Auth to change the production sign-in email.</p>{message && <p className="admin-records-message">{message}</p>}<button className="admin-os-primary" disabled={saving}>{saving ? "Saving..." : "Save profile"}<Save size={15} /></button></form>
      <section className="admin-settings-card"><div className="admin-settings-heading"><span><ShieldCheck size={17} /></span><div><p>ACCESS POLICY</p><h2>Protected operations</h2></div></div><ul className="admin-account-list"><li><BadgeCheck size={15} />Role: Admin</li><li><BadgeCheck size={15} />Primary account: enforced</li><li><BadgeCheck size={15} />All Admin APIs require an authorised session</li></ul><p className="admin-settings-muted">The Admin role cannot be changed here because RAC operates with one approved operator.</p></section>
      <section className="admin-settings-card"><div className="admin-settings-heading"><span><KeyRound size={17} /></span><div><p>SIGN-IN SECURITY</p><h2>Password recovery</h2></div></div><p className="admin-settings-muted">Passwords are never displayed or stored in the Admin panel. In production, use Supabase Auth&apos;s password-reset flow from the configured sign-in screen. Development mode accepts any eight-character password and must not be used for live access.</p></section>
    </div>
  </div>;
}
