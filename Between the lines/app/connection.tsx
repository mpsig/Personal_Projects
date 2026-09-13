'use client';
import { useCallback, useEffect, useState } from 'react';
type Status={connected:boolean;available:boolean;plan:string|null;loginPending:boolean;loginError:string|null;apiConfigured:boolean;error?:string};
export default function Connection({provider,onProvider,busy}:{provider:string;onProvider:(value:string)=>void;busy:boolean}) {
  const [status,setStatus]=useState<Status|null>(null);
  const [authUrl,setAuthUrl]=useState('');const [waiting,setWaiting]=useState(false);const [error,setError]=useState('');const [signingIn,setSigningIn]=useState(false);
  const refresh=useCallback(async()=>{
    try {const response=await fetch('/api/auth',{cache:'no-store'});const data=await response.json();if (!response.ok) throw new Error(data.error);setStatus(data);if(data.connected){setAuthUrl('');setWaiting(false);}if(data.loginError){setError(data.loginError);setWaiting(false);}return data as Status;}
    catch {setError('Could not check the research connection.');return null;}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);
  useEffect(()=>{
    if (!waiting) return;
    const interval=setInterval(()=>{void refresh();},2500);
    const timeout=setTimeout(()=>{setWaiting(false);setError('Sign-in is taking longer than expected. Check the connection or try again.');},10*60_000);
    return ()=>{clearInterval(interval);clearTimeout(timeout);};
  },[waiting,refresh]);
  async function signIn() {
    setSigningIn(true);setError('');
    try {const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const data=await response.json();if(!response.ok)throw new Error(data.error);setAuthUrl(data.authUrl);setWaiting(true);}
    catch(e){setError(e instanceof Error?e.message:'Could not start sign-in.');}finally{setSigningIn(false);}
  }
  async function cancel() {try {const response=await fetch('/api/auth',{method:'DELETE'});if(!response.ok)throw new Error();setAuthUrl('');setWaiting(false);await refresh();}catch{setError('Could not cancel sign-in. Please retry.');}}
  return <section className="connection" aria-label="Research connection">
    <label htmlFor="provider">Research with</label><select id="provider" value={provider} onChange={e=>onProvider(e.target.value)} disabled={busy}><option value="chatgpt">ChatGPT subscription (via Codex)</option><option value="api">OpenAI API key</option></select>
    {provider==='chatgpt' ? <>
      <p className="connection-status" role="status">{!status?'Checking connection…':status.connected?`● ChatGPT connected${status.plan ? ` · ${status.plan}` : ''}`:status.available?'Sign in to research new books.':status.error}</p>
      <p className="fine">Uses your Codex allowance. An existing Codex ChatGPT sign-in can be reused.</p>
      {!status?.connected && !authUrl && <button type="button" className="connect-button" disabled={busy||signingIn} onClick={signIn}>{signingIn?'Starting sign-in…':'Sign in with ChatGPT'}</button>}
      {authUrl && <div className="login-prompt"><a className="connect-button" href={authUrl} target="_blank" rel="noopener noreferrer">Continue on OpenAI’s sign-in page ↗</a><p className="fine">Finish signing in there, then return here. Your password stays with OpenAI.</p><button type="button" onClick={cancel}>Cancel sign-in</button></div>}
      <button type="button" className="connection-refresh" disabled={busy||signingIn} onClick={()=>void refresh()}>Check connection</button>
    </> : <p className="fine">{status?.apiConfigured?'API key configured. API usage is billed separately.':'Add OPENAI_API_KEY to .env.local and restart the app to use this option.'}</p>}
    {error && <p role="alert" className="connection-error">{error}</p>}
  </section>;
}
