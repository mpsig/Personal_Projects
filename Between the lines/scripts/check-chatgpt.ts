import { CodexBridge, startResearchThread, runCodexTurn } from '../lib/codex-bridge';
async function main() {
  const bridge=new CodexBridge();
  try {
    console.log(JSON.stringify(await bridge.status()));
    if (process.argv.includes('--session') || process.argv.includes('--research')) {
      const session=await startResearchThread(bridge,'Return only JSON for book research.',true);
      console.log(JSON.stringify({sessionConfigured:true,model:session.model}));
      try {
        if (process.argv.includes('--research')) {
          const result=await runCodexTurn(bridge,session.thread.id,'Search the web for the official publisher page for Stargirl by Jerry Spinelli. Open that page using its full HTTPS URL. Return its book title and sourceUrl as JSON. This is a small connection test; do not write a report.',{type:'object',properties:{title:{type:'string'},sourceUrl:{type:'string'}},required:['title','sourceUrl'],additionalProperties:false},120_000);
          console.log(JSON.stringify({webSearchEvents:result.items.filter(i=>i.type==='webSearch').map(i=>i.action),answer:result.items.filter(i=>i.type==='agentMessage').at(-1)?.text}));
        }
      } finally {await session.cleanup();}
    }
  }
  finally {bridge.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
