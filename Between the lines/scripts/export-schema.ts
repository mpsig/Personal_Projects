import { writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { GuideSchema, StoredSchema, ResearchSchema } from '../lib/schema';
async function main() {
  for (const [name,schema] of [['report',GuideSchema],['stored-report',StoredSchema],['research',ResearchSchema]] as const) {
    await writeFile(`skills/book-discussion-guide/references/${name}.schema.json`, JSON.stringify(z.toJSONSchema(schema),null,2)+'\n');
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
