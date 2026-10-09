import type Database from 'better-sqlite3';
export interface InferredFact { subject: string; predicate: string; object: string; rule: string; explanation: string }
/** A small, explainable forward-chaining RDFS-style reasoner over library subject hierarchy. */
export function inferFacts(db: Database): InferredFact[] {
  const facts: InferredFact[] = [];
  const rows = db.prepare(`SELECT b.id,b.title,s.name AS subject,s.broader_id FROM books b JOIN book_subjects bs ON bs.book_id=b.id JOIN subjects s ON s.id=bs.subject_id WHERE s.broader_id IS NOT NULL`).all() as Array<{id:number;title:string;subject:string;broader_id:number}>;
  const getParent = db.prepare('SELECT name,broader_id FROM subjects WHERE id=?');
  const insert = db.prepare('INSERT INTO inferred_facts(subject,predicate,object,rule,explanation) VALUES(?,?,?,?,?)');
  const existing = new Set((db.prepare('SELECT subject,predicate,object FROM inferred_facts').all() as Array<{subject:string;predicate:string;object:string}>).map(x=>`${x.subject}|${x.predicate}|${x.object}`));
  for (const row of rows) {
    let parentId: number | null = row.broader_id; let child = row.subject; const visited = new Set<number>();
    while (parentId !== null && !visited.has(parentId)) {
      visited.add(parentId);
      const parent = getParent.get(parentId) as {name:string;broader_id:number|null}|undefined;
      if (!parent) break;
      const key = `book:${row.id}|hasSubject|${parent.name}`;
      if (!existing.has(key)) { const fact = {subject:`book:${row.id}`,predicate:'hasSubject',object:parent.name,rule:'SUBJECT-INHERITANCE',explanation:`“${row.title}” is tagged with “${child}”, which is narrower than “${parent.name}”. The subject hierarchy therefore implies this broader subject.`}; facts.push(fact); insert.run(fact.subject,fact.predicate,fact.object,fact.rule,fact.explanation); existing.add(key); }
      child = parent.name; parentId = parent.broader_id;
    }
  }
  return facts;
}
