import { z } from 'zod';
import { normalize } from './normalize';

const text = z.string().min(1);
const ids = z.array(text);
export const InputSchema = z.strictObject({
  title: z.string().trim().min(1).max(240).refine(value => normalize(value).length > 0, 'Enter a book title'),
  author: z.string().trim().max(160).optional().default(''),
  grade: z.string().trim().max(40).optional().default(''),
  depth: z.enum(['standard', 'advanced']).optional().default('standard'),
});
export type BookInput = z.infer<typeof InputSchema>;
export const SourceSchema = z.strictObject({
  id: text, title: text, url: z.string().url().regex(/^https?:\/\//),
  publisher: text, author: text.nullable(), publishedAt: text.nullable(),
  accessedAt: text,
  kind: z.enum(['author', 'publisher', 'educational', 'journalism', 'reference', 'corroboration']),
  credibility: text,
});
const claim = z.strictObject({id: text, text, kind: z.enum(['fact', 'interpretation']), sourceIds: ids});
const supported = z.strictObject({text, claimIds: ids});
export const GuideSchema = z.strictObject({
  schemaVersion: z.enum(['1.0', '1.1']),
  book: z.strictObject({title: text, author: text, titleAliases: z.array(text), authorAliases: z.array(text),
    publicationYear: z.number().int().nullable(), genre: text, setting: text, pointOfView: text, premise: text, claimIds: ids}),
  summary: z.array(supported).min(3).max(8),
  characters: z.array(z.strictObject({name: text, role: text, arc: text, claimIds: ids})).min(2).max(10),
  themes: z.array(z.strictObject({name: text, interpretation: text, claimIds: ids})).min(3).max(5),
  questions: z.array(z.strictObject({question: text, whyAsking: text, listenFor: text, followUp: text, claimIds: ids})).length(5),
  parallels: z.array(z.strictObject({title: text, kind: z.enum(['documented', 'hypothetical']), connection: text, discussionPrompt: text, claimIds: ids})).min(2).max(4),
  authorFacts: z.array(supported).length(3),
  bigQuestion: text,
  claims: z.array(claim),
  quotes: z.array(z.strictObject({id: text, text, sourceId: text, claimIds: ids, context: text})).max(5),
  sources: z.array(SourceSchema).min(3),
  limitations: z.array(text),
});
export type Guide = z.infer<typeof GuideSchema>;
export const ResearchSchema = z.strictObject({
  status: z.enum(['ready', 'ambiguous', 'insufficient']),
  message: text,
  candidates: z.array(z.strictObject({title: text, author: text})),
  sources: z.array(SourceSchema),
  notes: z.array(z.strictObject({text, sourceIds: ids})),
  excerpts: z.array(z.strictObject({text, sourceId: text})),
});
export type Research = z.infer<typeof ResearchSchema>;
export const StoredSchema = z.strictObject({
  id: z.string().regex(/^[a-f0-9]{32}$/), createdAt: z.string().datetime(),
  input: InputSchema, model: text, responseIds: z.array(text),
  provenanceUrls: z.array(z.string().url()), guide: GuideSchema,
});
export type StoredReport = z.infer<typeof StoredSchema>;

export function canonicalUrl(raw: string) {
  const u = new URL(raw); u.hash = ''; u.searchParams.delete('utm_source');
  return u.toString().replace(/\/$/, '');
}
export function validateResearch(raw: unknown, urls?: string[]): Research {
  const packet = ResearchSchema.parse(raw);
  const known = new Set((urls ?? []).map(canonicalUrl));
  const sources = new Map(packet.sources.map(s => [s.id,s]));
  if (sources.size !== packet.sources.length) throw new Error('Duplicate research source IDs');
  if (new Set(packet.sources.map(s => canonicalUrl(s.url))).size < 3) throw new Error('Research needs three distinct sources');
  for (const s of packet.sources) if (urls && !known.has(canonicalUrl(s.url))) throw new Error('A cited source could not be verified against the web-search record. Please retry the research. No report was saved.');
  for (const n of packet.notes) if (n.sourceIds.some(id => !sources.has(id))) throw new Error('Unknown research note source');
  const words = new Map<string,number>();
  for (const e of packet.excerpts) {
    const s = sources.get(e.sourceId);
    if (!s) throw new Error('Unknown excerpt source');
    const key = canonicalUrl(s.url);
    words.set(key,(words.get(key) ?? 0) + e.text.trim().split(/\s+/).length);
    if (words.get(key)! > 25) throw new Error('Research excerpt budget exceeded');
  }
  return packet;
}
export function validateGuide(raw: unknown, research?: Research, urls?: string[]): Guide {
  const g = GuideSchema.parse(raw);
  const sources = new Map(g.sources.map(s => [s.id, s]));
  const claims = new Map(g.claims.map(c => [c.id, c]));
  if (sources.size !== g.sources.length || claims.size !== g.claims.length || new Set(g.quotes.map(q => q.id)).size !== g.quotes.length) throw new Error('Duplicate evidence IDs');
  const checkClaims = (refs: string[]) => { if (refs.some(id => !claims.has(id))) throw new Error('Unknown claim reference'); };
  for (const c of g.claims) if (c.sourceIds.some(id => !sources.has(id))) throw new Error('Unknown source reference');
  checkClaims(g.book.claimIds);
  for (const item of [...g.summary, ...g.characters, ...g.themes, ...g.questions, ...g.parallels, ...g.authorFacts]) checkClaims(item.claimIds);
  for (const f of g.authorFacts) if (f.claimIds.some(id => claims.get(id)?.kind !== 'fact')) throw new Error('Author facts need factual evidence');
  const words = new Map<string, number>();
  for (const q of g.quotes) {
    checkClaims(q.claimIds);
    const s = sources.get(q.sourceId);
    if (!s || q.claimIds.some(id => !claims.get(id)?.sourceIds.includes(q.sourceId))) throw new Error('Quote/source mapping mismatch: quote ' + q.id + ' uses source ' + q.sourceId + ', but that source is missing or is not included by every referenced claim (' + q.claimIds.join(', ') + ').');
    const key = canonicalUrl(s.url);
    words.set(key, (words.get(key) ?? 0) + q.text.trim().split(/\s+/).length);
    if (words.get(key)! > 25) throw new Error('Quote budget exceeded for source');
    if (research && !research.excerpts.some(e => e.sourceId === q.sourceId && e.text.includes(q.text))) throw new Error('Quote not present in research evidence');
  }
  if (research) for (const s of g.sources) {
    const original = research.sources.find(r => r.id === s.id);
    if (!original || JSON.stringify(original) !== JSON.stringify(s)) throw new Error('Source metadata changed after research');
  }
  if (urls && g.schemaVersion === '1.0') {
    const known = new Set((urls ?? []).map(canonicalUrl));
    if (g.sources.some(s => !known.has(canonicalUrl(s.url)))) throw new Error('Source URL missing from web-search provenance');
  }
  return g;
}

export const BriefSchema = GuideSchema.omit({claims:true,sources:true,quotes:true}).extend({
  schemaVersion:z.literal('1.1'),
  book:GuideSchema.shape.book.omit({claimIds:true}),
  summary:z.array(supported.omit({claimIds:true})).min(3).max(8),
  characters:z.array(GuideSchema.shape.characters.element.omit({claimIds:true})).min(2).max(10),
  themes:z.array(GuideSchema.shape.themes.element.omit({claimIds:true})).min(3).max(5),
  questions:z.array(GuideSchema.shape.questions.element.omit({claimIds:true})).length(5),
  parallels:z.array(GuideSchema.shape.parallels.element.omit({claimIds:true})).min(2).max(4),
  authorFacts:z.array(supported.omit({claimIds:true})).length(3),
});
export function assembleBrief(raw:unknown, research:Research):Guide {
  const b=BriefSchema.parse(raw);
  const refs=<T extends object>(x:T)=>({...x,claimIds:[]});
  return validateGuide({...b,book:refs(b.book),summary:b.summary.map(refs),
    characters:b.characters.map(refs),themes:b.themes.map(refs),questions:b.questions.map(refs),
    parallels:b.parallels.map(refs),authorFacts:b.authorFacts.map(refs),
    sources:research.sources,claims:[],quotes:[]});
}
