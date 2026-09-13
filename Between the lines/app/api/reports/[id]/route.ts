import { NextRequest, NextResponse } from 'next/server';
import { FileReportRepository } from '../../../../lib/repository';
import { renderMarkdown } from '../../../../lib/markdown';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, context: {params:Promise<{id:string}>}) {
  try {
    const report = await new FileReportRepository().get((await context.params).id);
    if (!report) return NextResponse.json({error:'Report not found.'},{status:404});
    const markdown = renderMarkdown(report);
    const format = request.nextUrl.searchParams.get('format');
    if (format === 'md' || format === 'json') return new NextResponse(format === 'md' ? markdown : JSON.stringify(report,null,2), {headers:{'Content-Type':format === 'md' ? 'text/markdown; charset=utf-8' : 'application/json','Content-Disposition':`attachment; filename="${report.id}.${format}"`}});
    return NextResponse.json({report,markdown,cached:true});
  } catch { return NextResponse.json({error:'This saved report could not be read.'},{status:500}); }
}
