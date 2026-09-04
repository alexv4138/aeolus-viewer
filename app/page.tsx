'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, Check, ChevronRight, CircleAlert, Droplets, Eye, EyeOff, Gauge, LockKeyhole, LogOut, ShieldCheck, Thermometer, UserRound, Wind, Zap } from 'lucide-react';
import { workbookTelemetry, workbookUsers, type WorkbookTelemetry, type WorkbookUser } from './fleet-data';

type Point = WorkbookTelemetry;
type SessionUser = WorkbookUser & { master: boolean };
type Turbine = { id: string; locationId: number; location: string; owner: WorkbookUser; hasSourceHistory: boolean };
type Alert = { time: string; severity: 'info' | 'warning' | 'critical'; parameter: string; text: string };

const fallbackMaster: WorkbookUser = { locationId: 0, location: 'Control rețea', role: 1, username: 'supervisor', password: 'northstar-26', name: 'Elena Marin', phone: '' };
const users = workbookUsers.length ? workbookUsers : [fallbackMaster];
const masterAccount = users.find((user) => user.role === 1) ?? fallbackMaster;
const operatorAccounts = users.filter((user) => user.role !== 1);
const referenceHistory = workbookTelemetry.filter((point) => point.IDLocatie === 1);

const turbines: Turbine[] = operatorAccounts.map((owner) => ({
  id: `TURBINĂ ${String(owner.locationId).padStart(2, '0')}`,
  locationId: owner.locationId,
  location: owner.location,
  owner,
  hasSourceHistory: workbookTelemetry.some((point) => point.IDLocatie === owner.locationId),
}));

function cloneForLocation(point: Point, locationId: number, index: number): Point {
  const shift = locationId - 1;
  return {
    ...point,
    IDLocatie: locationId,
    TempC: Number((point.TempC - shift * 0.7).toFixed(1)),
    PresAtm: Number((point.PresAtm + shift * 0.9).toFixed(1)),
    Umiditate: Number((point.Umiditate + shift * 1.3).toFixed(1)),
    VitVant: Number(Math.max(1.2, point.VitVant + shift * 0.25).toFixed(2)),
    Turatie: Number((point.Turatie + shift * 4.8).toFixed(2)),
    Voltaj: Number((point.Voltaj + shift * 1.4).toFixed(2)),
    Amperaj: Number((point.Amperaj + shift * 0.28).toFixed(2)),
    Putere: Number((point.Putere + shift * 18 + index * 0.1).toFixed(3)),
    Energie: Number((point.Energie + shift * 0.1).toFixed(6)),
    Vibratii: Number((point.Vibratii + shift * 0.01).toFixed(3)),
    CupluMec: Number((point.CupluMec + shift * 0.7).toFixed(2)),
    TempInfas: Number((point.TempInfas + shift * 0.5).toFixed(2)),
  };
}

function makeHistory(locationId: number): Point[] {
  const supplied = workbookTelemetry.filter((point) => point.IDLocatie === locationId);
  if (supplied.length) return supplied;
  return referenceHistory.map((point, index) => cloneForLocation(point, locationId, index));
}

const initialRecords = Object.fromEntries(turbines.map((turbine) => [turbine.locationId, makeHistory(turbine.locationId)])) as Record<number, Point[]>;
function format(value: number, digits = 1) { return value.toLocaleString('ro-RO', { minimumFractionDigits: digits, maximumFractionDigits: digits }); }
function formatTime(value: string) { return new Date(value).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }); }

function nextPoint(point: Point, locationId: number): Point {
  const wind = Math.max(1.1, Math.min(14, point.VitVant + (Math.random() - .45) * .5));
  const power = Math.max(12, point.Putere + (wind - point.VitVant) * 24 + (Math.random() - .45) * 7);
  return {
    ...point,
    IDLocatie: locationId,
    DataOra: new Date().toISOString(),
    TempC: Number((point.TempC + (Math.random() - .47) * .22).toFixed(1)),
    PresAtm: Number((point.PresAtm + (Math.random() - .5) * .4).toFixed(1)),
    Umiditate: Number(Math.max(35, Math.min(94, point.Umiditate + (Math.random() - .5) * .8)).toFixed(1)),
    VitVant: Number(wind.toFixed(2)),
    RadSolara: Number(Math.max(0, point.RadSolara + (Math.random() - .5) * 6).toFixed(2)),
    Turatie: Number(Math.max(0, point.Turatie + (wind - point.VitVant) * 13 + (Math.random() - .5) * 3).toFixed(2)),
    Voltaj: Number((point.Voltaj + (Math.random() - .5) * .9).toFixed(2)),
    Amperaj: Number(Math.max(.1, point.Amperaj + (power - point.Putere) / 50).toFixed(2)),
    Putere: Number(power.toFixed(3)),
    Energie: Number((point.Energie + power / 3600).toFixed(6)),
    Vibratii: Number(Math.max(.01, point.Vibratii + (Math.random() - .5) * .012).toFixed(3)),
    CupluMec: Number((point.CupluMec + (Math.random() - .5) * .45).toFixed(2)),
    TempInfas: Number((point.TempInfas + (Math.random() - .5) * .18).toFixed(2)),
    Alarma: wind > 12.5 ? 1 : 0,
  };
}

function MiniBars({ points, field, color = '#18201e', large = false }: { points: Point[]; field: keyof Point; color?: string; large?: boolean }) {
  const values = points.map((point) => Number(point[field])); const max = Math.max(...values, 1);
  return <div className={`mini-bars ${large ? 'large' : ''}`} aria-hidden="true">{values.map((value, index) => <span key={`${index}-${value}`} style={{ height: `${Math.max(8, value / max * 100)}%`, backgroundColor: color }} />)}</div>;
}
function Metric({ icon, label, value, unit, tone }: { icon: React.ReactNode; label: string; value: string; unit: string; tone: string }) { return <div className={`metric metric-${tone}`}><span className="metric-icon">{icon}</span><div><span>{label}</span><strong>{value} <em>{unit}</em></strong></div></div>; }
function KeyStat({ label, value, unit, safe }: { label: string; value: string; unit: string; safe?: boolean }) { return <div className="key-stat"><span>{label}</span><strong>{value} <em>{unit}</em></strong>{safe && <small>Normal</small>}</div>; }
function ChartPanel({ label, sublabel, points, field, color, wide, onOpen }: { label: string; sublabel: string; points: Point[]; field: keyof Point; color?: string; wide?: boolean; onOpen?: () => void }) { const safe = points.length ? points : referenceHistory.slice(0, 1); return <button type="button" className={`chart-panel ${wide ? 'wide' : ''}`} onClick={onOpen}><div className="chart-title"><strong>{label}</strong><span>{sublabel}</span></div><MiniBars points={safe} field={field} color={color} /><div className="chart-axis"><span>{formatTime(safe[0].DataOra)}</span><span>{formatTime(safe[Math.floor(safe.length / 2)].DataOra)}</span><span>{formatTime(safe.at(-1)!.DataOra)}</span></div></button>; }

export default function Home() {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [showPassword, setShowPassword] = useState(false); const [current, setCurrent] = useState<SessionUser | null>(null); const [selectedLocationId, setSelectedLocationId] = useState(turbines[0]?.locationId ?? 0); const [error, setError] = useState(''); const [records, setRecords] = useState(initialRecords); const [lastUpdate, setLastUpdate] = useState(new Date());
  useEffect(() => { const saved = window.localStorage.getItem('urban-lentz-session'); if (saved) { const account = users.find((user) => user.username === saved); if (account) { setCurrent({ ...account, master: account.username === masterAccount.username }); setSelectedLocationId(account.locationId || turbines[0]?.locationId || 0); } } }, []);
  useEffect(() => { const timer = window.setInterval(() => { void fetch('/api/telemetry', { method: 'POST' }); setRecords((previous) => Object.fromEntries(turbines.map((turbine) => { const history = previous[turbine.locationId] ?? makeHistory(turbine.locationId); return [turbine.locationId, [...history.slice(-23), nextPoint(history.at(-1)!, turbine.locationId)]]; }))); setLastUpdate(new Date()); }, 20000); return () => window.clearInterval(timer); }, []);
  const selectedTurbine = turbines.find((turbine) => turbine.locationId === selectedLocationId) ?? turbines[0];
  const [fromDate, setFromDate] = useState(''); const [toDate, setToDate] = useState(''); const [popup, setPopup] = useState<{label:string;field:keyof Point;color?:string}|null>(null);
  const allPoints = records[selectedTurbine?.locationId] ?? referenceHistory;
  const points = allPoints.filter((point) => (!fromDate || point.DataOra.slice(0,10) >= fromDate) && (!toDate || point.DataOra.slice(0,10) <= toDate));
  const latest = (points.at(-1) ?? allPoints.at(-1) ?? referenceHistory[0])!;
  function exportData() { const rows = [['Turbină','Locație','DataOra','Temperatură','Presiune','Umiditate','Vânt','Putere','Energie'], ...points.map(p=>[selectedTurbine.id,selectedTurbine.location,p.DataOra,p.TempC,p.PresAtm,p.Umiditate,p.VitVant,p.Putere,p.Energie])]; const csv='\\uFEFF'+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(';')).join('\\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); a.download='telemetrie-turbina.csv'; a.click(); }
  const selectedAlerts: Alert[] = latest.Alarma ? [{ time: formatTime(latest.DataOra), severity: 'warning', parameter: 'Viteza vântului', text: 'Depășește pragul configurat' }] : [{ time: formatTime(lastUpdate.toISOString()), severity: 'info', parameter: 'Sistem', text: 'Fără alarme active' }];
  const isOperational = latest.Alarma === 0;
  function signIn(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const account = users.find((user) => user.username.toLowerCase() === username.trim().toLowerCase() && user.password === password); if (!account) { setError('Verifică numele de utilizator și parola.'); return; } const master = account.username === masterAccount.username; setCurrent({ ...account, master }); window.localStorage.setItem('urban-lentz-session', account.username); const assigned = turbines.find((turbine) => turbine.locationId === account.locationId) ?? turbines[0]; setSelectedLocationId(assigned?.locationId ?? 0); setError(''); }
  if (!current) return <main className="login-page"><header className="login-topbar"><div className="brand"><Wind size={30} strokeWidth={1.35} /><strong>SISTEM MONITORIZARE URBAN LENTZ 2</strong></div><div className="login-clock">DATA/ORA: {lastUpdate.toLocaleDateString('ro-RO')} {lastUpdate.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })} EET</div></header><div className="login-content"><section className="login-visual" aria-hidden="true"><video autoPlay loop muted playsInline preload="auto"><source src="/turbine-loop-back.mp4" type="video/mp4" /></video><span>URBAN LENTZ 2</span></section><section className="login-panel"><form onSubmit={signIn}><p className="eyebrow">ACCES SECURIZAT</p><h1>BINE AI VENIT!</h1><p className="login-lede">Accesează sistemul de monitorizare pentru turbinele eoliene urbane.</p><div className="login-rule" /><label>Nume utilizator<span className="input-wrap"><UserRound size={18} /><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="Introdu nume utilizator" /></span></label><label>Parolă<span className="input-wrap"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Introdu parola" /><button type="button" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>{error && <p className="form-error"><CircleAlert size={15} />{error}</p>}<button type="submit" className="solid-button"><LockKeyhole size={17} />LOGARE <ChevronRight size={17} /></button><p className="login-security"><ShieldCheck size={17} />Sistem securizat. Toate drepturile rezervate.</p></form></section></div><footer className="login-footer">© 2026 Urban Lentz 2 · Sistem de monitorizare turbine</footer>{popup && <div className="chart-modal" role="dialog" onClick={()=>setPopup(null)}><div className="chart-modal-content" onClick={e=>e.stopPropagation()}><button className="chart-modal-close" onClick={()=>setPopup(null)}>Închide</button><h2>{popup.label}</h2><p>{selectedTurbine.location} · {fromDate || "toată perioada"} – {toDate || "acum"}</p><MiniBars points={points} field={popup.field} color={popup.color} large /></div></div>}</main>;
  const title = current.master ? 'Prezentare flotă' : selectedTurbine.id;
  return <main className="app-shell"><div className="turbine-backdrop" aria-hidden="true"><video autoPlay loop muted playsInline preload="auto"><source src="/turbine-loop-back.mp4" type="video/mp4" /></video></div><header className="topbar"><div><p className="eyebrow">URBAN LENTZ 2 / OPERAȚIUNI</p><h1>{title}</h1></div><div className="header-meta"><span><i className="live-dot" />LIVE</span><span>{lastUpdate.toLocaleDateString('ro-RO')} {lastUpdate.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })} EET</span><button onClick={() => { window.localStorage.removeItem('urban-lentz-session'); setCurrent(null); }} title="Deconectare"><LogOut size={17} /></button></div></header><div className="identity-row"><div><span className="section-label">AUTENTIFICAT</span><strong>{current.name}</strong><span>{current.username}</span></div><div><span className="section-label">LOCAȚIE</span><strong>{current.master ? 'Control rețea' : selectedTurbine.location}</strong><span>{current.master ? `${turbines.length} turbine conectate` : `Telefon: ${current.phone}`}</span></div><div className="system-ok"><Check size={16} /><span>Sistem operațional</span></div></div><section className="operations-grid"><aside className="weather-column"><p className="section-label">VREME</p><Metric tone="temperature" icon={<Thermometer />} label="Temperatura aerului" value={format(latest.TempC)} unit="°C" /><Metric tone="pressure" icon={<Gauge />} label="Presiune atmosferică" value={format(latest.PresAtm)} unit="hPa" /><Metric tone="humidity" icon={<Droplets />} label="Umiditate" value={format(latest.Umiditate)} unit="%" /><Metric tone="wind" icon={<Wind />} label="Viteza vântului" value={format(latest.VitVant)} unit="m/s" /><Metric tone="direction" icon={<ArrowUpRight />} label="Direcția vântului" value={latest.DirectieVant} unit="" /><Metric tone="solar" icon={<Zap />} label="Radiație solară" value={format(latest.RadSolara)} unit="W/m²" /></aside><section className="main-column"><div className="parameter-head"><div className="parameter-tools"><p className="section-label">PARAMETRII TURBINEI</p>{current.master && <label className="turbine-picker"><span>SELECTEAZĂ TURBINA</span><select value={selectedLocationId} onChange={(event) => setSelectedLocationId(Number(event.target.value))}>{turbines.map((turbine) => <option key={turbine.locationId} value={turbine.locationId}>{turbine.id} · {turbine.location}</option>)}</select></label>}</div><span className="unit-note">Ciclu curent • actualizare în 20 s</span></div><div className="parameter-overview"><div className="parameter-grid parameter-grid-full"><KeyStat label="Turație" value={format(latest.Turatie)} unit="RPM" /><KeyStat label="Voltaj" value={format(latest.Voltaj)} unit="V" /><KeyStat label="Amperaj" value={format(latest.Amperaj)} unit="A" /><KeyStat label="Putere" value={format(latest.Putere)} unit="W" /><KeyStat label="Energie" value={format(latest.Energie, 3)} unit="kWh" /><KeyStat label="Vibrație" value={format(latest.Vibratii, 2)} unit="G" safe /><KeyStat label="Cuplu mecanic" value={format(latest.CupluMec)} unit="Nm" /><KeyStat label="Temperatura vântului" value={format(latest.TempInfas)} unit="°C" /></div></div><div className="range-toolbar"><label>De la <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} /></label><label>Până la <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} /></label><button type="button" onClick={exportData}>Exportă Excel</button></div><div className="chart-grid"><ChartPanel label="PUTERE / W" sublabel="Istoric disponibil" points={points} field="Putere" onOpen={()=>setPopup({label:"PUTERE / W",field:"Putere"})} /><ChartPanel label="VÂNT / m/s" sublabel="Istoric disponibil" points={points} field="VitVant" color="#527c68" onOpen={()=>setPopup({label:"VÂNT / m/s",field:"VitVant",color:"#527c68"})} /></div><ChartPanel label="ENERGIE / kWh" sublabel="Cumulativ · telemetrie permanentă" points={points} field="Energie" wide onOpen={()=>setPopup({label:"ENERGIE / kWh",field:"Energie"})} /></section><aside className="alarm-column"><p className="section-label">STARE ȘI ALARME</p><div className="status-block"><ShieldCheck size={32} /><div><span>Stare turbină</span><strong>{isOperational ? 'OPERAȚIONALĂ' : 'AVERTISMENT'}</strong></div></div><div className="limit-row"><span>Protecție supraturație</span><b className={isOperational ? 'ok' : 'warn'}>{isOperational ? 'OK' : 'VERIFICĂ'}</b></div><div className="limit-row"><span>Temperatura vântului</span><b className="warn">{format(latest.TempInfas)} °C</b></div><div className="alarm-list"><div className="list-title"><span>JURNAL ALARME</span><span>{selectedAlerts.length} recentă</span></div>{selectedAlerts.map((alert) => <div className="alarm-item" key={`${alert.time}-${alert.parameter}`}><div><span className={`severity ${alert.severity}`}>{alert.severity === 'warning' ? 'avertisment' : alert.severity === 'critical' ? 'critic' : 'info'}</span><span>{alert.time}</span></div><strong>{alert.parameter}</strong><p>{alert.text}</p></div>)}</div></aside></section>{current.master && <section className="fleet-section"><div className="fleet-heading"><div><p className="section-label">PANOU PRINCIPAL</p><h2>Starea flotei</h2></div><span>Date importate din TabelDateTurbine.xlsx; actualizare la 20 s.</span></div><div className="fleet-table"><div className="fleet-row table-head"><span>Turbină</span><span>Putere</span><span>Vânt</span><span>Alerte</span><span>Stare</span></div>{turbines.map((turbine) => { const point = records[turbine.locationId].at(-1)!; return <button className="fleet-row fleet-row-button" onClick={() => setSelectedLocationId(turbine.locationId)} key={turbine.id}><span><strong>{turbine.id}</strong><small>{turbine.location}</small></span><span>{format(point.Putere)} W</span><span>{format(point.VitVant)} m/s</span><span className={point.Alarma ? 'critical-text' : ''}>{point.Alarma ? 'Avertisment' : 'Fără alerte'}</span><span><i className="live-dot" />{point.Alarma ? 'Verifică' : 'Operațională'}</span></button>; })}</div></section>}<footer><span>Import telemetrie: ciclu de 20 de secunde</span><span><Activity size={14} /> Istoric permanent indexat</span><span>© 2026 Urban Lentz 2</span></footer>{popup && <div className="chart-modal" role="dialog" onClick={()=>setPopup(null)}><div className="chart-modal-content" onClick={e=>e.stopPropagation()}><button className="chart-modal-close" onClick={()=>setPopup(null)}>Închide</button><h2>{popup.label}</h2><p>{selectedTurbine.location} · {fromDate || "toată perioada"} – {toDate || "acum"}</p><MiniBars points={points} field={popup.field} color={popup.color} large /></div></div>}</main>;
}



