import type { StoredReport } from './schema';
const clean = (s: string) => s.replace(/[\\`*_{}\[\]<>#|]/g, '\\$&');
export function renderMarkdown(r: StoredReport): string {
  const g = r.guide;
  const refs = (ids: string[]) => {
    const sources = [...new Set(ids.flatMap(id => g.claims.find(c => c.id === id)?.sourceIds ?? []))];
    return sources.map(id => { const s = g.sources.find(s => s.id === id)!; return `[${clean(id)}](<${s.url}>)`; }).join(' · ');
  };
  const p = (value: string, ids: string[]) => `${clean(value)} ${refs(ids)}\n`;
  return [
    `# ${clean(g.book.title)}\n\nBy ${clean(g.book.author)}\n`,
    `Parent discussion guide · Full spoilers · Saved ${r.createdAt.slice(0, 10)}\n\nGrade: ${clean(r.input.grade || 'Not specified')} · Depth: ${r.input.depth}\n`,
    '## Book snapshot\n',
    p(`${g.book.publicationYear ?? 'Year unverified'} · ${g.book.genre}\n\nSetting: ${g.book.setting}\n\nPoint of view: ${g.book.pointOfView}\n\n${g.book.premise}`, g.book.claimIds),
    '## The story, including the ending\n', ...g.summary.map(x => p(x.text, x.claimIds)),
    '## People to know\n', ...g.characters.map(x => `### ${clean(x.name)}\n\n${p(`${x.role} ${x.arc}`, x.claimIds)}`),
    '## Themes to explore\n\nThese are interpretations, open to discussion.\n',
    ...g.themes.map(x => `### ${clean(x.name)}\n\n${p(x.interpretation, x.claimIds)}`),
    '## Five questions for a real conversation\n\nListen for reasoning, not a single correct answer.\n',
    ...g.questions.map((x, i) => `### ${i + 1}. ${clean(x.question)}\n\n**Why ask:** ${clean(x.whyAsking)}\n\n**Listen for:** ${clean(x.listenFor)}\n\n**Follow up:** ${clean(x.followUp)}\n\n${refs(x.claimIds)}\n`),
    '## Beyond the book\n', ...g.parallels.map(x => `### ${clean(x.title)}\n\n*${x.kind === 'hypothetical' ? 'Hypothetical everyday situation' : 'Documented real-world example'}*\n\n${p(x.connection, x.claimIds)}\n**Try asking:** ${clean(x.discussionPrompt)}\n`),
    '## Three things about the author\n', ...g.authorFacts.map(x => p(x.text, x.claimIds)),
    `## One big question\n\n${clean(g.bigQuestion)}\n`,
    ...(g.quotes.length ? ['## In their words\n'] : []), ...g.quotes.map(q => { const s = g.sources.find(s => s.id === q.sourceId)!; return `> ${clean(q.text)}\n\n— [${clean(s.title)}](<${s.url}>)\n\n${clean(q.context)} ${refs(q.claimIds)}\n`; }),
    ...(g.limitations.length ? ['## Evidence limitations\n', ...g.limitations.map(x => `- ${clean(x)}\n`)] : []),
    '## Sources\n', ...g.sources.map(s => `- **${clean(s.id)}** — [${clean(s.title)}](<${s.url}>). ${clean(s.publisher)}; ${clean(s.kind)}. ${s.author ? `By ${clean(s.author)}. ` : ''}Published: ${clean(s.publishedAt ?? 'not provided')}; accessed ${clean(s.accessedAt)}. ${clean(s.credibility)}\n`),
    ...(g.claims.length ? ['## Claims and evidence\n'] : []), ...g.claims.map(c => `- **${clean(c.id)} · ${c.kind}** — ${p(c.text, [c.id])}`),
  ].join('\n');
}
