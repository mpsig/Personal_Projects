import { GenerationError, generateReport } from './generate';
import { InputSchema, type BookInput, type StoredReport } from './schema';
import type { ReportRepository, Match } from './repository';
export async function getOrCreate(raw: unknown, repo: ReportRepository, generate: (i:BookInput)=>Promise<StoredReport> = generateReport) {
  const input = InputSchema.parse(raw);
  const resolve = async (match: Match) => {
    if (match.kind === 'ambiguous') throw new GenerationError('Several saved books share this title. Choose the author.',409,match.entries);
    if (match.kind === 'hit') {
      const report = await repo.get(match.entry.id);
      if (!report) throw new Error('Saved report is missing');
      return {report,cached:true};
    }
    return null;
  };
  const hit = await resolve(await repo.find(input));
  if (hit) return hit;
  return repo.withLock(async () => {
    const second = await resolve(await repo.find(input));
    if (second) return second;
    const report = await generate(input);
    const canonical = await resolve(await repo.find({...input,title:report.guide.book.title,author:report.guide.book.author}));
    if (canonical) return canonical;
    await repo.save(report);
    return {report,cached:false};
  });
}
