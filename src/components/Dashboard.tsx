"use client";

import { useMemo, useState } from "react";
import type { Dataset, Knowledge, Role, Answer } from "@/lib/types";

type Tab = "overview" | "knowledge" | "sources" | "review";
const roleNames: Record<Role, string> = { engineering: "Engineering", product: "Product", support: "Customer Support", marketing: "Marketing" };
const prompts = [
  "Can customers use recurring appointments?",
  "When do SMS reminders go out?",
  "Has bulk import been released?",
  "Is the AI scheduling assistant ready?",
];
function cleanDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.valueOf()) ? value : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
function prettyState(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (x) => x.toUpperCase());
}
function Badge({ status }: { status: string }) {
  const type = status === "approved" || status === "released" ? "green" : status === "draft" || status === "unverified" ? "amber" : status === "rolled-back" || status === "rejected" ? "red" : "gray";
  return <span className={`pill pill-${type}`}>{prettyState(status)}</span>;
}
function Logo() {
  return <span className="logo-mark"><span className="logo-corner">◢</span></span>;
}
export default function Dashboard({ data }: { data: Dataset }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [role, setRole] = useState<Role>("support");
  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState(prompts[0]);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Knowledge | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const isDemo = data.workspace === "demo";
  const visible = useMemo(() => data.knowledge.filter((item) => item.audiences.includes(role) && (item.status === "approved" || role === "engineering" || role === "product")), [data.knowledge, role]);
  const filtered = useMemo(() => visible.filter((item) => `${item.title} ${item.summary} ${item.id}`.toLowerCase().includes(query.toLowerCase())), [visible, query]);
  const visibleSourceIds = useMemo(() => new Set(visible.flatMap((item) => item.sourceIds)), [visible]);
  const visibleSources = useMemo(() => data.sources.filter((source) => visibleSourceIds.has(source.id)), [data.sources, visibleSourceIds]);
  const approved = visible.filter((item) => item.status === "approved");
  const draftCount = visible.filter((item) => item.status === "draft").length;
  const sourceMap = useMemo(() => new Map(visibleSources.map((source) => [source.id, source])), [visibleSources]);

  async function ask(q = question) {
    if (!q.trim()) return;
    setQuestion(q);
    setAsking(true); setError(""); setAnswer(null);
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, role, workspace: data.workspace }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Question failed");
      setAnswer(result as Answer);
    } catch (err) { setError(err instanceof Error ? err.message : "Unexpected error"); }
    finally { setAsking(false); }
  }
  async function sync() {
    setBusy(true); setNotice("");
    try {
      const res = await fetch("/api/private/sync", { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Sync failed");
      setNotice(`Checked ${result.checked} PRs · ${result.created} created · ${result.updated} updated · ${result.unchanged} unchanged`);
      window.location.reload();
    } catch (err) { setNotice(err instanceof Error ? err.message : "Sync failed"); }
    finally { setBusy(false); }
  }
  async function review(entry: Knowledge, decision: "approved" | "rejected") {
    setBusy(true); setNotice("");
    try {
      const res = await fetch("/api/private/review", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, version: entry.version, decision }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || result.message || "Review failed");
      window.location.reload();
    } catch (err) { setNotice(err instanceof Error ? err.message : "Review failed"); }
    finally { setBusy(false); }
  }
  const entries = tab === "review" ? filtered.filter((k) => k.status === "draft") : filtered;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><Logo/><span>product<span className="brand-light">intelligence</span><small>HUB / v0.1</small></span></div>
      <div className="sidebar-label">WORKSPACE</div>
      <div className="workspace-switch"><div className="workspace-icon">{isDemo ? "H" : "M"}</div><div><strong>{data.company}</strong><small>{isDemo ? "Fictional company · Sandbox" : "Private engineering workspace"}</small></div><span className="workspace-caret">⌄</span></div>
      <div className="sidebar-label">OPERATIONS</div>
      <nav className="nav-list" aria-label="Main navigation">
        {([ ["overview", "Overview", "▦"], ["knowledge", "Knowledge base", "◫"], ["sources", "Source records", "⟐"], ["review", "Review queue", "◇"] ] as [Tab, string, string][]).map(([id,name,icon]) =>
          <button key={id} className={`nav-button ${tab===id?"active":""}`} onClick={()=>{setTab(id);setSelected(null)}}><span className="nav-icon">{icon}</span>{name}{id==="review" && <span className="nav-count">{draftCount}</span>}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-help"><span className="live-dot"/> {isDemo ? "DEMO DATASET" : "CONNECTED WORKSPACE"}<p>{isDemo ? "Safe, fictional data. No real client information." : "Only configured repository data is ingested."}</p></div>
        <a className="sidebar-link" href={isDemo?"/workspace":"/"}>{isDemo?"Open private workspace ↗":"Explore public demo ↗"}</a>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs">Workspace <span>/</span> {tab === "overview" ? "Overview" : tab === "knowledge" ? "Knowledge base" : tab === "sources" ? "Source records" : "Review queue"}</div><div className="topbar-right"><span className="topbar-dot"/><span>{isDemo?"Demo environment":"Protected environment"}</span><span className="avatar">{isDemo ? "HD" : "MD"}</span></div></header>
      <div className="content">
        {isDemo && <div className="banner"><span className="banner-star">✦</span><div><strong>Interactive demo workspace</strong><span> Fictional company and records. Explore different roles to see how approved information is delivered.</span></div><span className="banner-tag">SANDBOX</span></div>}
        {notice && <div className="notice" role="status">{notice}<button aria-label="Dismiss message" onClick={()=>setNotice("")}>×</button></div>}
        <div className="page-head"><div><div className="eyebrow">PRODUCT OPERATIONS / {tab.toUpperCase()}</div><h1>{tab==="overview"?"Good afternoon.":tab==="knowledge"?"Knowledge base":tab==="sources"?"Source records":"Review queue"}</h1><p>{tab==="overview"?"One source of truth for what your engineering team is building and shipping.":tab==="knowledge"?"Typed, sourced, and versioned information about product changes.":tab==="sources"?"Original evidence records used to support product knowledge.":"Verify proposed facts before distributing them to other teams."}</p></div><div className="head-actions">{!isDemo && <button className="primary-button" onClick={sync} disabled={busy}>{busy?"Syncing…":"↻ Sync GitHub"}</button>}<span className="date-stamp">NOV 2026</span></div></div>
        {tab==="overview" && <>
          <div className="metric-grid"><Metric title="Knowledge entries" value={visible.length} icon="▤" sub="Across product work"/><Metric title="Approved records" value={approved.length} icon="✓" sub="Available for retrieval"/><Metric title="Awaiting review" value={draftCount} icon="◷" sub="Human verification required"/><Metric title="Evidence sources" value={visibleSources.length} icon="⟐" sub="Linked source documents"/></div>
          <div className="section-grid">
            <section className="panel"><div className="panel-heading"><div><h2>Recent product activity</h2><p>Latest updates from engineering knowledge</p></div><button className="text-button" onClick={()=>setTab("knowledge")}>View all →</button></div>
              <div className="activity-list">{visible.slice(0,6).map((item) => <button key={item.id} className="activity-row" onClick={()=>{setSelected(item);setTab("knowledge")}}><div className="item-symbol">{item.category==="Bug fix"?"⚒":item.category==="Incident"?"!":"⌘"}</div><div className="activity-content"><strong>{item.title}</strong><small>{item.id} · v{item.version} · {cleanDate(item.updatedAt)}</small></div><Badge status={item.status}/></button>)}</div>
            </section>
            <section className="panel intelligence-panel"><div className="panel-heading"><div><h2>Ask Product Intelligence</h2><p>Evidence-backed answers from approved records</p></div><span className="ai-mark">✳</span></div>
              <AskPanel role={role} setRole={(next)=>{setRole(next);setAnswer(null)}} question={question} setQuestion={setQuestion} answer={answer} asking={asking} error={error} ask={ask} sourceMap={sourceMap}/>
            </section>
          </div>
          <div className="principles"><div><span>01</span><strong>Traceable evidence</strong><p>Every approved claim points back to a specific record.</p></div><div><span>02</span><strong>Human verification</strong><p>Unreviewed drafts never become authoritative answers.</p></div><div><span>03</span><strong>Audience-aware</strong><p>Retrieve only knowledge approved for a selected role.</p></div></div>
        </>}
        {(tab==="knowledge" || tab==="review") && <div className="split-view">
          <section className="panel list-panel"><div className="list-tools"><input className="search-input" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search product knowledge…" aria-label="Search product knowledge"/><select aria-label="Preview role" value={role} onChange={(event)=>{setRole(event.target.value as Role);setSelected(null)}}>{Object.entries(roleNames).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></div>
            <div className="row-list">{entries.length===0?<div className="empty-list">No entries visible to this role.</div>:entries.map((item)=><button className={`knowledge-row ${selected?.id===item.id?"selected":""}`} onClick={()=>setSelected(item)} key={item.id}><div className="knowledge-line"><strong>{item.title}</strong><Badge status={item.status}/></div><p>{item.summary}</p><small>{item.id} · {item.category} · v{item.version}</small></button>)}</div>
          </section>
          <section className="panel detail-panel">{selected?<><div className="detail-header"><span className="eyebrow">KNOWLEDGE RECORD · {selected.id}</span><Badge status={selected.status}/></div><h2>{selected.title}</h2><p className="detail-summary">{selected.summary}</p><div className="meta-grid"><div><label>Category</label><strong>{selected.category}</strong></div><div><label>Release status</label><strong>{prettyState(selected.releaseState)}</strong></div><div><label>Version</label><strong>{selected.version}</strong></div><div><label>Classification</label><strong>{selected.method==="llm"?"LLM proposed":selected.method==="curated"?"Curated fixture":"Rules proposed"}</strong></div></div><h3>Claims and evidence</h3>{selected.claims.length===0?<p>No extracted claims.</p>:selected.claims.map((claim,i)=><div className="claim" key={i}><span className="claim-check">{selected.status==="approved"?"✓":"?"}</span><div><p>{claim.text}</p><div className="source-chips">{claim.sourceIds.map((id)=>{const source=sourceMap.get(id);return <span key={id} className="source-chip" title={source?.body||id}>{source?.label||"Source missing"}</span>})}</div></div></div>)}<h3>Accessible to</h3><div className="source-chips">{selected.audiences.map((r)=><span className="audience-chip" key={r}>{roleNames[r]}</span>)}</div>{selected.status==="draft" && <div className="review-actions"><p>{isDemo?"In the demo, approvals are read-only. Private workspace approvals create a new revision.":"Confirm accuracy and audience permissions against the linked source before approving."}</p><button className="primary-button" disabled={isDemo||busy} onClick={()=>review(selected,"approved")}>Approve new revision</button><button className="secondary-button" disabled={isDemo||busy} onClick={()=>review(selected,"rejected")}>Reject</button></div>}</>:<div className="detail-empty"><span>◫</span><h2>Select a knowledge entry</h2><p>Inspect the claims, source evidence, versions, and audience rules behind each record.</p></div>}</section>
        </div>}
        {tab==="sources" && <div className="sources-grid">{visibleSources.map((source)=><div className="panel source-card" key={source.id}><div className="source-top"><span className="provider-name">{source.provider}</span><span className="source-date">{cleanDate(source.updatedAt)}</span></div><h2>{source.title}</h2><p>{source.body}</p><div className="source-bottom"><span>{source.label}</span>{source.url?<a href={source.url} target="_blank" rel="noreferrer">Original source ↗</a>:<span>Fixture record</span>}</div></div>)}</div>}
        <footer className="footer">Product Intelligence Hub · Evidence before automation · {isDemo?"Fictional demonstration":"Private workspace"}</footer>
      </div>
    </main>
  </div>;
}
function Metric({ title, value, icon, sub }: { title: string; value: number; icon: string; sub: string }) {
  return <div className="metric"><div className="metric-top"><span>{title}</span><span className="metric-icon">{icon}</span></div><div className="metric-value">{value.toString().padStart(2,"0")}</div><div className="metric-sub"><span className="green-tick">●</span> {sub}</div></div>;
}
function AskPanel({role,setRole,question,setQuestion,answer,asking,error,ask,sourceMap}: { role: Role; setRole:(role:Role)=>void; question:string;setQuestion:(s:string)=>void; answer:Answer|null; asking:boolean;error:string;ask:(q?:string)=>void;sourceMap:Map<string, Dataset["sources"][number]>}) {
  return <div className="ask-body"><div className="role-row"><label htmlFor="role">Answer as</label><select id="role" value={role} onChange={e=>setRole(e.target.value as Role)}>{Object.entries(roleNames).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></div><div className="prompt-chips">{prompts.slice(0,3).map(q=><button key={q} onClick={()=>ask(q)}>{q}</button>)}</div><form className="ask-form" onSubmit={(e)=>{e.preventDefault();ask()}}><input value={question} onChange={(e)=>setQuestion(e.target.value)} aria-label="Question for Product Intelligence" placeholder="Ask about features, releases, decisions…"/><button type="submit" disabled={asking||!question.trim()}>{asking?"…":"↑"}</button></form><p className="under-form">Only approved, role-accessible records are searched.</p>{error&&<div className="answer-error" role="alert">{error}</div>}{answer&&<div className="answer-card"><div className="answer-heading">✳ VERIFIED KNOWLEDGE EXTRACT</div><p>{answer.answer}</p>{answer.citations.length>0&&<div className="answer-citations"><strong>Evidence</strong>{answer.citations.map(c=><span key={c.sourceId} title={sourceMap.get(c.sourceId)?.body||c.sourceId}>{c.url?<a href={c.url} target="_blank" rel="noreferrer">{c.label} ↗</a>:c.label}</span>)}</div>}<small>Deterministic extraction · Not an LLM-generated response</small></div>}</div>;
}
