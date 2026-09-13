import { codexBridge, startResearchThread, runCodexTurn, type CodexConnection } from './codex-bridge';
import { GenerationError, generateReport, type ResearchClient } from './generate';
import type { BookInput } from './schema';

export function chatgptResearchClient(connection:CodexConnection):ResearchClient {
  const client:ResearchClient={responses:{create:async request=>{
    const researching=!!request.tools?.length;
    const format=request.text?.format;
    if (format?.type!=='json_schema') throw new Error('A report schema is required.');
    const instructions=`${request.instructions}\nThe app already handles repository lookup and saving. Return only the requested JSON. ${researching ? 'You MUST perform web search before answering. Open each cited source with the web tool using its full https URL (not a search-result ID), so the app can verify source provenance from openPage events. Collect evidence for the ending and all required report sections.' : 'Synthesize only from the supplied packet; web search is disabled.'}`;
    const session=await startResearchThread(connection,instructions,researching);
    client.modelName=`codex/${session.model}`;
    try {
      const result=await runCodexTurn(connection,session.thread.id,typeof request.input==='string'?request.input:JSON.stringify(request.input),format.schema);
      const messages=result.items.filter(item=>item.type==='agentMessage');
      const final=messages.filter(item=>item.phase==='final_answer').at(-1) ?? messages.at(-1);
      if (!final?.text) throw new GenerationError('Codex returned no finished guide. No report was saved.');
      return {id:`codex:${session.thread.id}:${result.id}`,status:'completed',output_text:final.text,
        output:result.items.filter(item=>item.type==='webSearch').map(item=>({type:'web_search_call',status:'completed',action:item.action ?? {}}))};
    } finally {await session.cleanup();}
  }}};
  return client;
}
export async function generateViaChatGPT(input:BookInput) {
  const bridge=codexBridge();
  try {
    if (!(await bridge.status()).connected) throw new GenerationError('Sign in with ChatGPT in the connection panel to research this book.',401);
    return await generateReport(input,chatgptResearchClient(bridge));
  } catch(error) {
    if (error instanceof GenerationError) throw error;
    throw new GenerationError(error instanceof Error ? error.message : 'ChatGPT research failed. Please check your connection.',502);
  }
}
