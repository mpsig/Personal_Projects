import { mkdir, readFile, writeFile, rename, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { StoredSchema, validateGuide, type StoredReport, type BookInput } from './schema';
import { normalize } from './normalize';
import { renderMarkdown } from './markdown';

export type Entry = { id: string; title: string; author: string; titleAliases: string[]; authorAliases: string[]; createdAt: string; grade: string; depth: string };
export type Match = {kind: 'miss'} | {kind: 'hit'; entry: Entry} | {kind: 'ambiguous'; entries: Entry[]};
export function lookup(entries: Entry[], input: Pick<BookInput, 'title' | 'author'>): Match {
  const found = entries.filter(e => [e.title, ...e.titleAliases].some(t => normalize(t) === normalize(input.title)) &&
    (!input.author || [e.author, ...e.authorAliases].some(a => normalize(a) === normalize(input.author))));
  return found.length === 0 ? {kind: 'miss'} : found.length === 1 ? {kind: 'hit', entry: found[0]} : {kind: 'ambiguous', entries: found};
}
export interface ReportRepository {
  list(): Promise<Entry[]>;
  get(id: string): Promise<StoredReport | null>;
  find(input: BookInput): Promise<Match>;
  save(report: StoredReport): Promise<void>;
  withLock<T>(action: () => Promise<T>): Promise<T>;
}
export class BusyError extends Error {}
export class FileReportRepository implements ReportRepository {
  constructor(readonly root = process.env.REPORTS_DIR || path.join(process.cwd(), 'reports')) {}
  async withLock<T>(action: () => Promise<T>): Promise<T> {
    await mkdir(this.root, {recursive:true});
    const lock = path.join(this.root, '.write-lock');
    try { await mkdir(lock); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new BusyError('Another report is being prepared. Please try again shortly.');
      throw error;
    }
    try { return await action(); } finally { await rm(lock, {recursive:true, force:true}); }
  }
  async get(id: string): Promise<StoredReport | null> {
    if (!/^[a-f0-9]{32}$/.test(id)) return null;
    let raw: string;
    try { raw = await readFile(path.join(this.root, id, 'report.json'), 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
    const report = StoredSchema.parse(JSON.parse(raw));
    if (report.id !== id) throw new Error('Report identity mismatch');
    validateGuide(report.guide, undefined, report.provenanceUrls);
    return report;
  }
  async list(): Promise<Entry[]> {
    await mkdir(this.root, {recursive:true});
    const entries: Entry[] = [];
    for (const id of await readdir(this.root)) {
      if (!/^[a-f0-9]{32}$/.test(id)) continue;
      const r = await this.get(id);
      if (r) entries.push({id, title:r.guide.book.title, author:r.guide.book.author, titleAliases:r.guide.book.titleAliases,
        authorAliases:r.guide.book.authorAliases, createdAt:r.createdAt, grade:r.input.grade, depth:r.input.depth});
    }
    return entries.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }
  async find(input: BookInput) { return lookup(await this.list(), input); }
  // Caller holds withLock: adapters must provide equivalent transactional semantics.
  async save(raw: StoredReport) {
    const report = StoredSchema.parse(raw);
    validateGuide(report.guide, undefined, report.provenanceUrls);
    if (await this.get(report.id)) return;
    const temp = path.join(this.root, `.pending-${randomUUID()}`);
    await mkdir(temp, {recursive:true});
    try {
      await writeFile(path.join(temp, 'report.json'), JSON.stringify(report, null, 2));
      await writeFile(path.join(temp, 'report.md'), renderMarkdown(report));
      await rename(temp, path.join(this.root, report.id));
      await this.rebuildIndex();
    } finally { await rm(temp, {recursive:true, force:true}); }
  }
  async rebuildIndex() {
    const temp = path.join(this.root, `.index-${randomUUID()}.json`);
    await writeFile(temp, JSON.stringify({version:1, reports:await this.list()}, null, 2));
    await rename(temp, path.join(this.root, 'index.json'));
  }
}
export function reportId(title: string, author: string) {
  return createHash('sha256').update(JSON.stringify([normalize(title), normalize(author)])).digest('hex').slice(0,32);
}
