import { useState, useMemo, useEffect } from “react”;
import {
ComposedChart, Line, Area, Scatter,
XAxis, YAxis, CartesianGrid, Tooltip,
ReferenceLine, ResponsiveContainer,
} from “recharts”;

function linRegression(points) {
const n = points.length;
if (n < 2) return null;
const sumX  = points.reduce((a, p) => a + p.load, 0);
const sumY  = points.reduce((a, p) => a + p.v, 0);
const sumXY = points.reduce((a, p) => a + p.load * p.v, 0);
const sumX2 = points.reduce((a, p) => a + p.load * p.load, 0);
const kRaw  = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
const v0    = (sumY - kRaw * sumX) / n;
const yMean = sumY / n;
const ssTot = points.reduce((a, p) => a + (p.v - yMean) ** 2, 0);
const ssRes = points.reduce((a, p) => a + (p.v - (v0 + kRaw * p.load)) ** 2, 0);
const r2    = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
return { k: -kRaw, v0, r2 };
}

function vertFromV0adj(v0adj) {
return Math.max(0, (v0adj ** 2 / 19.62) * 39.37);
}
function speedNeededForVert(vertInches, k, load, cf) {
const v0needed = Math.sqrt((vertInches / 39.37) * 19.62) / cf;
return Math.max(0, v0needed - k * load);
}

// ── Tooltip ────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, k, cf }) => {
if (!active || !payload?.length) return null;
const d   = payload[0]?.payload;
const v   = d?.velocity ?? d?.v;
if (v == null || d?.load == null) return null;
const vert = vertFromV0adj((v + k * d.load) * cf);
return (
<div style={{ background:”#0a0a0a”, border:“1px solid #222”, padding:“10px 14px”, borderRadius:8, fontFamily:“monospace”, fontSize:11 }}>
<div style={{ color:”#e8ff3c”, fontWeight:700, marginBottom:6 }}>{d.load} lb plate</div>
<div style={{ color:”#555”, marginBottom:2 }}>Speed    <span style={{ color:”#fff”, float:“right”, marginLeft:16 }}>{v?.toFixed(3)} m/s</span></div>
<div style={{ color:”#555” }}>Pred vert <span style={{ color:”#fff”, float:“right”, marginLeft:16 }}>{vert.toFixed(1)}”</span></div>
</div>
);
};

// ── Slider ─────────────────────────────────────────────────────────────────
function Slider({ label, value, min, max, step, onChange, unit, accent }) {
const pct     = ((value - min) / (max - min)) * 100;
const display = step < 1 ? value.toFixed(2) : value;
return (
<div style={{ marginBottom:20 }}>
<div style={{ display:“flex”, justifyContent:“space-between”, alignItems:“flex-end”, marginBottom:8 }}>
<span style={{ fontSize:9, letterSpacing:3, textTransform:“uppercase”, color:”#444” }}>{label}</span>
<span style={{ fontSize:26, fontWeight:700, color:accent||”#fff”, fontFamily:“monospace”, lineHeight:1 }}>
{display}<span style={{ fontSize:10, color:”#333”, marginLeft:3 }}>{unit}</span>
</span>
</div>
<div style={{ position:“relative”, height:4, background:”#181818”, borderRadius:99 }}>
<div style={{ position:“absolute”, left:0, top:0, height:“100%”, width:`${pct}%`, background:accent||”#fff”, borderRadius:99 }} />
<div style={{ position:“absolute”, top:“50%”, left:`${pct}%`, transform:“translate(-50%,-50%)”, width:14, height:14, borderRadius:“50%”, background:accent||”#fff”, border:“2px solid #060606”, pointerEvents:“none” }} />
<input type=“range” min={min} max={max} step={step} value={value}
onChange={e => onChange(parseFloat(e.target.value))}
style={{ position:“absolute”, width:“100%”, height:24, top:“50%”, transform:“translateY(-50%)”, opacity:0, cursor:“pointer”, margin:0 }} />
</div>
</div>
);
}

// ── Arc Gauge ──────────────────────────────────────────────────────────────
function ArcGauge({ pct, vert, color }) {
const r=64, cx=80, cy=84;
const toRad = d => d * Math.PI / 180;
const pt    = a => ({ x: cx + r*Math.cos(toRad(a)), y: cy + r*Math.sin(toRad(a)) });
const start=pt(215), bgEnd=pt(505), endAngle=215+290*Math.min(1,pct/100), end=pt(endAngle);
const large = endAngle-215>180?1:0;
return (
<svg width="160" height="150" viewBox="0 0 160 150">
<path d={`M${start.x} ${start.y} A${r} ${r} 0 1 1 ${bgEnd.x} ${bgEnd.y}`} fill=“none” stroke=”#161616” strokeWidth=“9” strokeLinecap=“round” />
{pct>1 && <path d={`M${start.x} ${start.y} A${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`} fill=“none” stroke={color} strokeWidth=“9” strokeLinecap=“round” />}
<text x={cx} y={cy-6} textAnchor=“middle” fill=”#fff” style={{ fontSize:30, fontWeight:700, fontFamily:“monospace” }}>{vert.toFixed(1)}”</text>
<text x={cx} y={cy+18} textAnchor=“middle” fill=”#383838” style={{ fontSize:9, letterSpacing:3, fontFamily:“monospace” }}>VERT</text>
</svg>
);
}

// ── Scatter Dot ────────────────────────────────────────────────────────────
const DataDot = ({ cx, cy, payload, onEdit }) => {
if (!cx || !cy) return null;
return (
<g onClick={() => onEdit(payload.id)} style={{ cursor:“pointer” }}>
<circle cx={cx} cy={cy} r={7} fill="#e8ff3c" stroke="#060606" strokeWidth={2} />
<circle cx={cx} cy={cy} r={16} fill="transparent" />
</g>
);
};

// ── Number Input ───────────────────────────────────────────────────────────
function NumInput({ label, value, onChange, step = 1, color = “#fff” }) {
return (
<div style={{ flex:1 }}>
<div style={{ fontSize:9, color:”#333”, letterSpacing:2, marginBottom:6 }}>{label}</div>
<input type=“number” value={value} step={step}
onChange={e => onChange(parseFloat(e.target.value) || 0)}
style={{ width:“100%”, background:”#0a0a0a”, border:“1px solid #222”, borderRadius:8, padding:“8px 10px”, color, fontSize:16, fontFamily:“monospace”, fontWeight:700, outline:“none” }} />
</div>
);
}

// ── Vert status ────────────────────────────────────────────────────────────
function vertStatus(vert) {
if (vert <  4) return { label:“Beginner”,     color:”#ff4d4d” };
if (vert <  8) return { label:“Developing”,   color:”#ff8c00” };
if (vert < 14) return { label:“Intermediate”, color:”#ffcc00” };
if (vert < 20) return { label:“Advanced”,     color:”#e8ff3c” };
if (vert < 26) return { label:“Elite”,        color:”#39ff9f” };
return               { label:“World Class”,   color:”#00cfff” };
}

// ── Main ───────────────────────────────────────────────────────────────────
const DEFAULT_POINTS = [
{ id:1, load:25, v:1.5  },
{ id:2, load:55, v:0.76 },
];

export default function App() {
const [loaded, setLoaded]         = useState(false);
const [dataPoints, setDataPoints] = useState(DEFAULT_POINTS);
const [load,       setLoad]       = useState(35);
const [speed,      setSpeed]      = useState(1.28);
const [targetVert, setTargetVert] = useState(25);
const [showTarget, setShowTarget] = useState(false);
const [cf,         setCf]         = useState(0.87); // 0.80=full counterbalance → 0.97=no counterbalance
const [panel,    setPanel]    = useState(null);
const [formLoad, setFormLoad] = useState(45);
const [formV,    setFormV]    = useState(1.0);
const [nextId,   setNextId]   = useState(10);
const [saveStatus, setSaveStatus] = useState(””);

// ── Load from storage on mount ──────────────────────────────────────────
useEffect(() => {
async function loadData() {
try {
const res = await window.storage.get(“pistol-data”);
if (res && res.value) {
const saved = JSON.parse(res.value);
if (saved.dataPoints?.length >= 2) setDataPoints(saved.dataPoints);
if (saved.targetVert) setTargetVert(saved.targetVert);
if (saved.load)       setLoad(saved.load);
if (saved.speed)      setSpeed(saved.speed);
if (saved.nextId)     setNextId(saved.nextId);
if (saved.cf)         setCf(saved.cf);
}
} catch (e) {
// No saved data yet — use defaults
}
setLoaded(true);
}
loadData();
}, []);

// ── Save to storage whenever key state changes ─────────────────────────
useEffect(() => {
if (!loaded) return; // don’t save before we’ve loaded
setSaveStatus(“saving”);
const timer = setTimeout(async () => {
try {
await window.storage.set(“pistol-data”, JSON.stringify({
dataPoints, targetVert, load, speed, nextId, cf
}));
setSaveStatus(“saved”);
setTimeout(() => setSaveStatus(””), 1500);
} catch (e) {
setSaveStatus(””);
}
}, 600); // debounce 600ms
return () => clearTimeout(timer);
}, [dataPoints, targetVert, load, speed, nextId, cf, loaded]);

const reg  = useMemo(() => linRegression(dataPoints), [dataPoints]);
const k    = reg?.k   ?? 0.0247;
const v0b  = reg?.v0  ?? 2.12;
const r2   = reg?.r2  ?? 1;

const curveData = useMemo(() => {
const pts = [];
for (let i = 0; i <= 200; i++) {
const v = v0b - k * i;
if (v <= 0) { pts.push({ load: parseFloat((v0b/k).toFixed(1)), velocity: 0 }); break; }
pts.push({ load: i, velocity: parseFloat(v.toFixed(4)) });
}
return pts;
}, [k, v0b]);

const v0user   = speed + k * load;
const vert     = vertFromV0adj(v0user * cf);
const needed   = speedNeededForVert(targetVert, k, load, cf);
const gap      = Math.max(0, needed - speed);
const vertPct  = Math.min(100,(vert/targetVert)*100);
const speedPct = Math.min(100,(speed/needed)*100);
const vertColor= vertPct<40?”#ff4d4d”:vertPct<75?”#ff8c00”:”#e8ff3c”;
const targetV0adj = Math.sqrt((targetVert/39.37)*19.62)/cf;
const status   = vertStatus(vert);

function openAdd() {
setFormLoad(45); setFormV(1.0); setPanel(“add”);
}
function openEdit(id) {
const pt = dataPoints.find(p => p.id===id);
if (!pt) return;
setFormLoad(pt.load); setFormV(pt.v); setPanel({ id, load:pt.load, v:pt.v });
}
function confirmAdd() {
if (dataPoints.find(p => p.load===formLoad)) {
// load already exists → treat as update
setDataPoints(prev => prev.map(p => p.load===formLoad ? { …p, v:formV } : p));
} else {
setDataPoints(prev => […prev, { id:nextId, load:formLoad, v:formV }]);
setNextId(n => n+1);
}
setPanel(null);
}
function confirmEdit() {
setDataPoints(prev => prev.map(p => p.id===panel.id ? { …p, load:formLoad, v:formV } : p));
setPanel(null);
}
function removePoint(id) {
if (dataPoints.length<=2) return;
setDataPoints(prev => prev.filter(p => p.id!==id));
if (panel?.id===id) setPanel(null);
}

const isEdit     = panel && panel !== “add”;
const panelOpen  = panel !== null;
const scatterData= dataPoints.map(p => ({ …p, velocity:p.v }));

if (!loaded) return (
<div style={{ minHeight:“100vh”, background:”#060606”, display:“flex”, alignItems:“center”, justifyContent:“center”, fontFamily:“monospace”, color:”#2a2a2a”, fontSize:11, letterSpacing:3 }}>
LOADING…
</div>
);

return (
<div style={{ minHeight:“100vh”, background:”#060606”, color:”#eee”, fontFamily:“monospace”, padding:“32px 18px”, display:“flex”, flexDirection:“column”, alignItems:“center” }}>
<style>{`* { box-sizing:border-box } input[type=range]{appearance:none} input[type=number]{-moz-appearance:textfield} input[type=number]::-webkit-inner-spin-button{display:none}`}</style>
<div style={{ width:“100%”, maxWidth:500 }}>

```
    {/* Header */}
    <div style={{ marginBottom:28, borderBottom:"1px solid #111", paddingBottom:16 }}>
      <div style={{ fontSize:9, color:"#e8ff3c", letterSpacing:5, textTransform:"uppercase", marginBottom:6 }}>Load–Velocity Profile</div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:19, fontWeight:700 }}>Pistol Squat Calculator</div>
        <div style={{ fontSize:9, color:"#2a2a2a", textAlign:"right", lineHeight:2 }}>
          <div>k = {k.toFixed(4)}</div>
          <div>R² = {r2.toFixed(3)}</div>
          <div style={{ color: saveStatus==="saved"?"#e8ff3c":saveStatus==="saving"?"#444":"transparent", transition:"color 0.3s" }}>
            {saveStatus==="saved"?"✓ saved":saveStatus==="saving"?"saving…":"·"}
          </div>
        </div>
      </div>
    </div>

    {/* Gauge + sliders */}
    <div style={{ background:"#0c0c0c", border:"1px solid #141414", borderRadius:16, padding:22, marginBottom:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:20, marginBottom:20 }}>
        <ArcGauge pct={vertPct} vert={vert} color={vertColor} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:9, color:"#333", letterSpacing:3, textTransform:"uppercase", marginBottom:4 }}>Adj v₀</div>
          <div style={{ fontSize:20, fontWeight:700, marginBottom:12 }}>{(v0user*cf).toFixed(3)} <span style={{ fontSize:10, color:"#333" }}>m/s</span></div>
          <div style={{ fontSize:9, color:"#333", letterSpacing:3, textTransform:"uppercase", marginBottom:4 }}>Need @ {load}lb → {targetVert}"</div>
          <div style={{ fontSize:20, fontWeight:700, color:gap===0?"#e8ff3c":"#ff4d4d" }}>{needed.toFixed(2)} <span style={{ fontSize:10, color:"#333" }}>m/s</span></div>
          <div style={{ fontSize:10, color:gap===0?"#e8ff3c":"#666", marginTop:3 }}>{gap===0?"✓ target hit":`+${gap.toFixed(2)} m/s gap`}</div>
        </div>
      </div>

      {/* Status badge */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#111", border:`1px solid ${status.color}22`, borderRadius:10, padding:"10px 14px", marginBottom:18 }}>
        <div style={{ fontSize:9, color:"#333", letterSpacing:3, textTransform:"uppercase" }}>Pistol Vert Status</div>
        <div style={{ fontSize:13, fontWeight:700, color:status.color, letterSpacing:1 }}>{status.label}</div>
      </div>

      {/* CF slider */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:8 }}>
          <div>
            <span style={{ fontSize:9, letterSpacing:3, textTransform:"uppercase", color:"#444" }}>Correction Factor</span>
            <div style={{ fontSize:9, color:"#333", marginTop:2 }}>
              {cf <= 0.83 ? "Full counterbalance" : cf <= 0.89 ? "Counterbalance" : cf <= 0.93 ? "Light counterbalance" : "No counterbalance"}
            </div>
          </div>
          <span style={{ fontSize:20, fontWeight:700, color:"#888", fontFamily:"monospace" }}>
            {cf.toFixed(2)}
          </span>
        </div>
        <div style={{ position:"relative", height:4, background:"#181818", borderRadius:99 }}>
          <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${((cf-0.80)/(0.97-0.80))*100}%`, background:"linear-gradient(90deg,#e8ff3c,#39ff9f)", borderRadius:99 }} />
          <div style={{ position:"absolute", top:"50%", left:`${((cf-0.80)/(0.97-0.80))*100}%`, transform:"translate(-50%,-50%)", width:14, height:14, borderRadius:"50%", background:"#888", border:"2px solid #060606", pointerEvents:"none" }} />
          <input type="range" min={0.80} max={0.97} step={0.01} value={cf}
            onChange={e => setCf(parseFloat(e.target.value))}
            style={{ position:"absolute", width:"100%", height:24, top:"50%", transform:"translateY(-50%)", opacity:0, cursor:"pointer", margin:0 }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:8, color:"#2a2a2a", marginTop:4 }}>
          <span>0.80 full CB</span><span>0.97 no CB</span>
        </div>
      </div>
      <Slider label="Plate Weight" value={load} min={5} max={200} step={5} onChange={setLoad} unit="lb" accent="#666" />
      <Slider label="Peak Velocity" value={speed} min={0.3} max={4.5} step={0.01} onChange={setSpeed} unit="m/s" accent="#e8ff3c" />
      <div style={{ marginTop:4 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"#2e2e2e", marginBottom:5, letterSpacing:2 }}>
          <span>SPEED TO TARGET</span><span>{speedPct.toFixed(0)}%</span>
        </div>
        <div style={{ background:"#111", borderRadius:99, height:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${speedPct}%`, background:gap===0?"#e8ff3c":"linear-gradient(90deg,#ff4d4d,#ff8c00)", borderRadius:99, transition:"width 0.15s" }} />
        </div>
      </div>
    </div>

    {/* Target vert */}
    <div style={{ background:"#0c0c0c", border:"1px solid #141414", borderRadius:16, padding:"16px 22px", marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:showTarget?16:0 }}>
        <div>
          <div style={{ fontSize:9, color:"#333", letterSpacing:3, textTransform:"uppercase", marginBottom:4 }}>Target Vert</div>
          <div style={{ fontSize:24, fontWeight:700, color:"#e8ff3c" }}>{targetVert}" <span style={{ fontSize:11, color:"#333" }}>vertical</span></div>
        </div>
        <button onClick={()=>setShowTarget(!showTarget)} style={{ width:38, height:38, borderRadius:"50%", background:showTarget?"#e8ff3c":"#161616", border:"1px solid #222", cursor:"pointer", fontSize:20, color:showTarget?"#000":"#555", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}>
          {showTarget?"−":"+"}
        </button>
      </div>
      {showTarget && <Slider label="Set Target Vert" value={targetVert} min={2} max={50} step={1} onChange={setTargetVert} unit='"' accent="#e8ff3c" />}
    </div>

    {/* Graph */}
    <div style={{ background:"#0c0c0c", border:"1px solid #141414", borderRadius:16, padding:"20px 6px 16px 2px", marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingLeft:16, paddingRight:12, marginBottom:6 }}>
        <div>
          <div style={{ fontSize:9, color:"#2a2a2a", letterSpacing:4, textTransform:"uppercase" }}>Load — Velocity Curve</div>
          <div style={{ fontSize:9, color:"#2a2a2a", marginTop:3 }}>v = {v0b.toFixed(3)} − {k.toFixed(4)} × load</div>
        </div>
        <div style={{ fontSize:9, color:"#2a2a2a" }}>R² {r2.toFixed(3)}</div>
      </div>

      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart margin={{ top:10, right:52, left:0, bottom:16 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#e8ff3c" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#e8ff3c" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#0f0f0f" strokeDasharray="4 4" />
          <XAxis dataKey="load" type="number" domain={[0, Math.max(100, Math.ceil(v0b/k/10)*10+10)]} stroke="#1a1a1a" tick={{ fill:"#2e2e2e", fontSize:10 }}
            label={{ value:"plate weight (lb)", position:"insideBottom", offset:-10, fill:"#2a2a2a", fontSize:9 }} />
          <YAxis type="number" domain={[0, Math.max(4,Math.ceil(v0b*1.15))]} stroke="#1a1a1a" tick={{ fill:"#2e2e2e", fontSize:10 }}
            label={{ value:"peak velocity (m/s)", angle:-90, position:"insideLeft", offset:14, fill:"#2a2a2a", fontSize:9 }} />
          <Tooltip content={<ChartTooltip k={k} cf={cf} />} />
          <Area data={curveData} type="linear" dataKey="velocity" stroke="#e8ff3c" strokeWidth={1.5} fill="url(#areaGrad)" dot={false} />
          <ReferenceLine x={load}  stroke="#e8ff3c" strokeDasharray="3 6" strokeWidth={1} opacity={0.4} />
          <ReferenceLine y={speed} stroke="#e8ff3c" strokeDasharray="3 6" strokeWidth={1} opacity={0.4}
            label={{ value:`${speed.toFixed(2)} m/s`, position:"right", fill:"#e8ff3c", fontSize:9 }} />
          <ReferenceLine y={targetV0adj} stroke="#ff4d4d" strokeDasharray="5 4" strokeWidth={1}
            label={{ value:`${targetVert}" target`, position:"right", fill:"#ff4d4d", fontSize:9 }} />
          <Scatter data={scatterData} dataKey="v" xAxisId={0} yAxisId={0}
            shape={(props) => <DataDot {...props} onEdit={openEdit} />} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Chips */}
      <div style={{ paddingLeft:16, paddingRight:12, marginTop:10 }}>
        <div style={{ fontSize:9, color:"#2a2a2a", letterSpacing:3, textTransform:"uppercase", marginBottom:8 }}>Data Points</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {[...dataPoints].sort((a,b)=>a.load-b.load).map(pt => {
            const isSelected = isEdit && panel.id===pt.id;
            return (
              <div key={pt.id} style={{ display:"flex", alignItems:"center", gap:6, background:isSelected?"#1a1a0a":"#111", border:`1px solid ${isSelected?"#e8ff3c33":"#1e1e1e"}`, borderRadius:20, padding:"5px 10px 5px 8px", fontSize:10, color:"#888" }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#e8ff3c" }} />
                <span style={{ color:"#fff" }}>{pt.load}lb</span>
                <span>·</span>
                <span style={{ color: isSelected?"#e8ff3c":"#888" }}>{pt.v.toFixed(2)} m/s</span>
                {/* Edit btn */}
                <button onClick={() => isSelected ? setPanel(null) : openEdit(pt.id)}
                  style={{ background:"none", border:"none", color:isSelected?"#e8ff3c":"#333", cursor:"pointer", fontSize:11, padding:"0 0 0 2px", lineHeight:1, fontFamily:"monospace" }}
                  onMouseEnter={e=>e.currentTarget.style.color="#e8ff3c"}
                  onMouseLeave={e=>e.currentTarget.style.color=isSelected?"#e8ff3c":"#333"}>
                  ✎
                </button>
                {/* Remove btn */}
                {dataPoints.length>2 && (
                  <button onClick={() => removePoint(pt.id)}
                    style={{ background:"none", border:"none", color:"#333", cursor:"pointer", fontSize:13, padding:"0", lineHeight:1 }}
                    onMouseEnter={e=>e.currentTarget.style.color="#ff4d4d"}
                    onMouseLeave={e=>e.currentTarget.style.color="#333"}>
                    ×
                  </button>
                )}
              </div>
            );
          })}
          <button onClick={panelOpen && !isEdit ? ()=>setPanel(null) : openAdd} style={{ background:panelOpen&&!isEdit?"#e8ff3c":"#111", border:`1px solid ${panelOpen&&!isEdit?"#e8ff3c":"#222"}`, borderRadius:20, padding:"5px 12px", fontSize:10, color:panelOpen&&!isEdit?"#000":"#444", cursor:"pointer", transition:"all 0.2s" }}>
            {panelOpen&&!isEdit?"cancel":"+ add"}
          </button>
        </div>

        {/* Panel */}
        {panelOpen && (
          <div style={{ marginTop:12, background:"#111", border:"1px solid #1e1e1e", borderRadius:12, padding:"14px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:9, color:"#333", letterSpacing:3, textTransform:"uppercase" }}>
                {isEdit ? `Update ${panel.load}lb Point` : "New Test Point"}
              </div>
              {isEdit && dataPoints.length>2 && (
                <button onClick={()=>removePoint(panel.id)} style={{ background:"none", border:"none", color:"#333", cursor:"pointer", fontSize:10, fontFamily:"monospace", letterSpacing:1 }}
                  onMouseEnter={e=>e.currentTarget.style.color="#ff4d4d"}
                  onMouseLeave={e=>e.currentTarget.style.color="#333"}>
                  remove point
                </button>
              )}
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:12 }}>
              {!isEdit && <NumInput label="LOAD (LB)" value={formLoad} onChange={setFormLoad} step={5} />}
              <NumInput label="PEAK SPEED (M/S)" value={formV} onChange={setFormV} step={0.01} color="#e8ff3c" />
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={isEdit ? confirmEdit : confirmAdd} style={{ flex:1, background:"#e8ff3c", border:"none", borderRadius:8, padding:"10px", color:"#000", fontSize:11, fontFamily:"monospace", fontWeight:700, letterSpacing:2, cursor:"pointer", textTransform:"uppercase" }}>
                {isEdit ? "Update" : "Add Point"}
              </button>
              <button onClick={()=>setPanel(null)} style={{ background:"#161616", border:"1px solid #222", borderRadius:8, padding:"10px 16px", color:"#555", fontSize:11, fontFamily:"monospace", cursor:"pointer" }}>
                cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Stats */}
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
      {[
        { label:"Slope k",  value:k.toFixed(4)         },
        { label:"Raw v₀",   value:v0b.toFixed(3)+" m/s" },
        { label:"CF",       value:cf.toFixed(2)         },
      ].map((s,i)=>(
        <div key={i} style={{ background:"#0c0c0c", border:"1px solid #141414", borderRadius:10, padding:"12px 14px" }}>
          <div style={{ fontSize:8, color:"#2a2a2a", letterSpacing:3, textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
          <div style={{ fontSize:13, fontWeight:700 }}>{s.value}</div>
        </div>
      ))}
    </div>

  </div>
</div>
```

);
}