'use client';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Entry } from '../lib/repository';
import type { StoredReport } from '../lib/schema';
import Connection from './connection';
type Result = {report:StoredReport;markdown:string;cached:boolean};
export default function Home() {
  const [updates,setUpdates] = useState<string[]>([]);
  const [library,setLibrary] = useState<Entry[]>([]);
  const [title,setTitle] = useState(''); const [author,setAuthor] = useState('');
  const [grade,setGrade] = useState(''); const [depth,setDepth] = useState('standard');
  const [query,setQuery] = useState(''); const [view,setView] = useState<'new'|'library'>('new');
  const [result,setResult] = useState<Result|null>(null); const [busy,setBusy] = useState(false);
  const [loadingLibrary,setLoadingLibrary] = useState(true); const [error,setError] = useState('');
  const [candidates,setCandidates] = useState<{title:string;author:string}[]>([]);
  const [provider,setProvider] = useState('chatgpt');
  async function refresh() {
    try { const response = await fetch('/api/reports'); const data = await response.json(); if (!response.ok) throw new Error(data.error); setLibrary(data.reports); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load library.'); }
    finally { setLoadingLibrary(false); }
  }
  useEffect(() => { void refresh(); },[]);
  async function open(id:string) {
    setBusy(true); setError(''); setCandidates([]);
    try { const response = await fetch(`/api/reports/${id}`); const data = await response.json(); if (!response.ok) throw new Error(data.error); setResult(data); }
    catch(e) { setError(e instanceof Error ? e.message : 'Could not open report.'); }
    finally { setBusy(false); }
  }
  async function prepare(event:React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setCandidates([]); setResult(null); setUpdates([]);
    try {
      const response = await fetch('/api/reports',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/x-ndjson'},body:JSON.stringify({title,author,grade,depth,provider})});
      if (!response.ok) {
        const data=await response.json();setCandidates(data.candidates ?? []);throw new Error(data.error);
      }
      if (!response.body) throw new Error('Could not connect to the progress stream.');
      const reader=response.body.getReader();const decoder=new TextDecoder();let pending='';let completed=false;
      try {
        while(true) {
          const {done,value}=await reader.read();pending+=decoder.decode(value,{stream:!done});
          const lines=pending.split('\n');pending=lines.pop() ?? '';
          for(const line of lines) {
            if(!line.trim())continue;const event=JSON.parse(line);
            if(event.type==='progress')setUpdates(previous=>[...previous,event.message]);
            if(event.type==='error'){setCandidates(event.candidates ?? []);throw new Error(event.error);}
            if(event.type==='result'){setResult(event);completed=true;}
          }
          if(done)break;
        }
      } finally {reader.releaseLock();}
      if(!completed)throw new Error('Connection interrupted. Check your library before trying again; the guide may still be saving.');
      await refresh();
    } catch(e) { setError(e instanceof Error ? e.message : 'Could not prepare report.'); }
    finally { setBusy(false); }
  }
  return <div className="shell">
    <header><a className="brand" href="/" aria-label="Between the Lines home"><span className="mark">b/l</span><span>Between the Lines<small>A PARENT’S READING COMPANION</small></span></a><span className="edition">THE CONVERSATION EDITION · V1</span></header>
    <main>
      <div className="intro"><span className="eyebrow">A GOOD BOOK IS ONLY THE BEGINNING</span><h1>Reading without a conversation is like,<br/>baking cookies and not sharing them</h1></div>
      <div className="workspace">
        <aside>
          <nav aria-label="Guide navigation"><button className={view === 'new' ? 'active' : ''} onClick={()=>setView('new')}>Prepare a guide <span>↗</span></button><button className={view === 'library' ? 'active' : ''} onClick={()=>setView('library')}>Your library <span>{library.length}</span></button></nav>
          <Connection provider={provider} onProvider={setProvider} busy={busy}/>
          {view === 'new' ? <form onSubmit={prepare}>
            <h2>What are they reading?</h2>
            <label htmlFor="title">Book title <span>required</span></label><input id="title" required maxLength={240} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Stargirl"/>
            <label htmlFor="author">Author <span>optional</span></label><input id="author" maxLength={160} value={author} onChange={e=>setAuthor(e.target.value)} placeholder="e.g. Jerry Spinelli"/>
            <div className="formrow"><div><label htmlFor="grade">Child’s grade</label><input id="grade" maxLength={40} value={grade} onChange={e=>setGrade(e.target.value)} placeholder="Optional"/></div><div><label htmlFor="depth">Discussion depth</label><select id="depth" value={depth} onChange={e=>setDepth(e.target.value)}><option value="standard">Standard</option><option value="advanced">Advanced</option></select></div></div>
            <button className="primary" disabled={busy || !title.trim()} type="submit">{busy ? 'Preparing your guide…' : 'Find or create guide'} <span aria-hidden="true">→</span></button>
          </form> : <section className="library"><h2>Your reading shelf</h2><label className="sr-only" htmlFor="filter">Search saved reports</label><input id="filter" placeholder="Search title or author" value={query} onChange={e=>setQuery(e.target.value)}/>{loadingLibrary ? <p>Loading library…</p> : library.length === 0 ? <p className="muted">Your first guide will appear here, ready to revisit.</p> : library.filter(e=>`${e.title} ${e.author}`.toLowerCase().includes(query.toLowerCase())).map(e=><button disabled={busy} className="book" key={e.id} onClick={()=>open(e.id)}><strong>{e.title}</strong><span>{e.author}</span><small>{e.createdAt.slice(0,10)} · {e.depth}</small></button>)}</section>}
          <div className="sidebar-note"><span>01 / READ ONCE, RETURN OFTEN</span><p>Every guide stays in your library. Open a saved book anytime, with no repeat research.</p></div>
        </aside>
        <section className="reading" aria-label="Discussion guide" aria-busy={busy}>
          {error && <div className="notice error" role="alert">{error}{candidates.map((c,i)=><button key={`${c.title}-${c.author}-${i}`} onClick={()=>{setTitle(c.title);setAuthor(c.author);setView('new');setCandidates([]);setError('Book selected. Choose Find or create guide to continue.');}}>{c.title} — {c.author}</button>)}</div>}
          {busy && <div className="notice" role="status"><strong>Preparing your guide</strong><ol>{updates.map((message,index)=><li key={index}>{index < updates.length-1 ? '✓ ' : ''}{message}</li>)}</ol>{updates.length===0 && <p>Connecting to the app…</p>}</div>}
          {result ? <><div className="reportbar"><span>{result.cached ? 'FROM YOUR LIBRARY' : 'RESEARCHED & SAVED'}</span><div><a href={`/api/reports/${result.report.id}?format=md`}>Download report</a><a href={`/api/reports/${result.report.id}?format=json`}>JSON</a><button onClick={()=>window.print()}>Print</button></div></div>{result.cached && <p className="cache-note">Saved guide by {result.report.guide.book.author}. Original settings: grade {result.report.input.grade || 'not specified'}, {result.report.input.depth} depth.</p>}<article><ReactMarkdown>{result.markdown}</ReactMarkdown></article></> : <div className="empty"><div className="book-art" aria-hidden="true"><div className="book-cover"><span>THE SPACE<br/>BETWEEN<br/>THE LINES</span><i>More than a summary.<br/>A place to begin.</i><b>↗</b></div><div className="book-shadow"/></div><span className="eyebrow">COME CURIOUS</span><h2>You don’t have to read every page<br/>to ask a thoughtful question.</h2><p>Start with a book. Leave with a better way into the conversation.</p><div className="features"><div><b>Understand</b><span>The essential story,<br/>including the ending.</span></div><div><b>Explore</b><span>Five questions that<br/>go beyond recall.</span></div><div><b>Connect</b><span>Ideas that reach<br/>beyond the book.</span></div></div><div className="evidence-note">SOURCE-LINKED · SPOILER-FILLED · ALWAYS PARENT-FACING</div></div>}
        </section>
      </div>
    </main><footer>Between the Lines <span>By. Malay Patel</span></footer>
  </div>;
}
