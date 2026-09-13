import { NextRequest, NextResponse } from 'next/server';
import { codexBridge } from '../../../lib/codex-bridge';
import { isSameOrigin } from '../../../lib/origin';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(request:NextRequest) {
  if (!isSameOrigin(request) || request.headers.get('sec-fetch-site')==='cross-site') return NextResponse.json({error:'Cross-origin requests are not allowed.'},{status:403,headers});
  try {return NextResponse.json({...await codexBridge().status(),available:true,apiConfigured:!!process.env.OPENAI_API_KEY},{headers});}
  catch {return NextResponse.json({connected:false,available:false,plan:null,loginPending:false,loginError:null,apiConfigured:!!process.env.OPENAI_API_KEY,error:'Could not connect to local Codex. Install Codex or set CODEX_BIN in .env.local.'},{headers});}
}
export async function POST(request:NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({error:'Cross-origin requests are not allowed.'},{status:403,headers});
  try {return NextResponse.json(await codexBridge().beginLogin(),{headers});}
  catch {return NextResponse.json({error:'Could not start ChatGPT sign-in. Check that Codex is installed and try again.'},{status:502,headers});}
}
export async function DELETE(request:NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({error:'Cross-origin requests are not allowed.'},{status:403,headers});
  try {await codexBridge().cancelLogin();return NextResponse.json({cancelled:true},{headers});}
  catch {return NextResponse.json({error:'Could not cancel sign-in. Please retry.'},{status:502,headers});}
}
