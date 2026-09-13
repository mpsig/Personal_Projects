import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { FileReportRepository, BusyError } from '../../../lib/repository';
import { getOrCreate } from '../../../lib/service';
import { GenerationError, generateReport } from '../../../lib/generate';
import { generateViaChatGPT } from '../../../lib/chatgpt-research';
import { InputSchema } from '../../../lib/schema';
import { renderMarkdown } from '../../../lib/markdown';
import { isSameOrigin } from '../../../lib/origin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const repo = new FileReportRepository();
export async function GET() {
  try { return NextResponse.json({reports:await repo.list()}); }
  catch { return NextResponse.json({error:'The report library could not be read. Check the storage directory.'},{status:500}); }
}
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({error:'Cross-origin requests are not allowed.'},{status:403});
  try {
    const text = await request.text();
    if (text.length > 4096) return NextResponse.json({error:'Request is too large.'},{status:413});
    const {provider,...input}=InputSchema.extend({provider:z.enum(['chatgpt','api']).default('chatgpt')}).parse(JSON.parse(text));
    const result = await getOrCreate(input, repo, provider==='chatgpt' ? generateViaChatGPT : generateReport);
    return NextResponse.json({...result,markdown:renderMarkdown(result.report)});
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) return NextResponse.json({error:'The input or generated report did not pass validation. Check the title and try again.'},{status:422});
    if (error instanceof GenerationError) return NextResponse.json({error:error.message,candidates:error.candidates},{status:error.status});
    if (error instanceof BusyError) return NextResponse.json({error:error.message},{status:409});
    console.error('Report request failed:', error instanceof Error ? error.name : 'Unknown error');
    return NextResponse.json({error:'The report could not be completed. Check API access and storage, then try again.'},{status:502});
  }
}
