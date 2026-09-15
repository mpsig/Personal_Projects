import type { Progress } from './progress';
import { codexBridge, startResearchThread, runCodexTurn, type CodexConnection } from './codex-bridge';
import { GenerationError, generateReport, collectUrls, type ResearchClient } from './generate';
import { canonicalUrl, ResearchSchema, type BookInput } from './schema';

export function chatgptResearchClient(connection:CodexConnection):ResearchClient {
  const client:ResearchClient={responses:{create:async request=>{
    const researching=!!request.tools?.length;
    const format=request.text?.format;
    if (format?.type!=='json_schema') throw new Error('A report schema is required.');
    const instructions=`${request.instructions}\nThe app already handles repository lookup and saving. Return only the requested JSON. ${researching ? 'You MUST perform web search before answering. Stop once required information is covered. Maximum six web calls targeting three to four credible sources. Never reopen pages for URL bookkeeping. Collect evidence for the ending and all required report sections.' : 'Synthesize only from the supplied packet; web search is disabled.'}`;
    const session=await startResearchThread(connection,instructions,researching);
    client.modelName=`codex/${session.model}`;
    try {
      let result=await runCodexTurn(connection,session.thread.id,typeof request.input==='string'?request.input:JSON.stringify(request.input),format.schema);
      const webItems=result.items.filter(item=>item.type==='webSearch');
      const messages=result.items.filter(item=>item.type==='agentMessage');
      const final=messages.filter(item=>item.phase==='final_answer').at(-1) ?? messages.at(-1);
      if (!final?.text) throw new GenerationError('Codex returned no finished guide. No report was saved.');
      return {id:`codex:${session.thread.id}:${result.id}`,status:'completed',output_text:final.text,
        output:webItems.map(item=>({...item,type:'web_search_call',status:'completed'}))};
    } finally {await session.cleanup();}
  }}};
  return client;
}
export async function generateViaChatGPT(input:BookInput, progress:Progress=()=>{}) {
  const bridge=codexBridge();
  try {
    if (!(await bridge.status()).connected) throw new GenerationError('Sign in with ChatGPT in the connection panel to research this book.',401);
    return await generateReport(input,chatgptResearchClient(bridge),progress);
  } catch(error) {
    if (error instanceof GenerationError) throw error;
    throw new GenerationError(error instanceof Error ? error.message : 'ChatGPT research failed. Please check your connection.',502);
  }
}
