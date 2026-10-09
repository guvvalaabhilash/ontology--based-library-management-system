import 'dotenv/config';
import { db, logActivity } from './database.js';
import { inferFacts } from '../ontology/reasoner.js';
const subjects = ['Artificial Intelligence','Computer Science','Mathematics','Physics','Philosophy','Literature','History','Biology','Economics','Psychology','Machine Learning','Neural Networks','Data Science','Robotics','Ethics','Programming','Statistics'];
const parentMap: Record<string,string> = {'Machine Learning':'Artificial Intelligence','Neural Networks':'Machine Learning','Data Science':'Computer Science','Programming':'Computer Science','Statistics':'Mathematics','Robotics':'Artificial Intelligence'};
async function fetchSubject(subject:string):Promise<void>{
  const url = `https://openlibrary.org/search.json?subject=${encodeURIComponent(subject)}&limit=100&fields=key,title,author_name,isbn,publisher,first_publish_year,language,subject,number_of_pages_median,cover_i`;
  const response = await fetch(url,{headers:{'User-Agent':process.env.OPEN_LIBRARY_USER_AGENT ?? 'MidnightArchive/1.0 (educational project)'}});
  if(!response.ok) throw new Error(`Open Library returned ${response.status} for ${subject}`);
  const payload = await response.json() as {docs?:Array<{key?:string;title?:string;author_name?:string[];isbn?:string[];publisher?:string[];first_publish_year?:number;language?:string[];subject?:string[];number_of_pages_median?:number;cover_i?:number}>};
  const save = db.transaction((docs:NonNullable<typeof payload.docs>)=>{
    for(const book of docs){ if(!book.key||!book.title) continue;
      const publisherName=book.publisher?.[0] ?? null;
      let publisherId:number|null=null; if(publisherName){db.prepare('INSERT OR IGNORE INTO publishers(name) VALUES(?)').run(publisherName); publisherId=(db.prepare('SELECT id FROM publishers WHERE name=?').get(publisherName) as {id:number}).id;}
      const result=db.prepare(`INSERT INTO books(open_library_key,title,isbn,publisher_id,year,language,description,cover_url,pages) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(open_library_key) DO NOTHING`).run(book.key,book.title,book.isbn?.[0]??null,publisherId,book.first_publish_year??null,book.language?.[0]??null,null,book.cover_i?`https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`:null,book.number_of_pages_median??null);
      const bookRow=db.prepare('SELECT id FROM books WHERE open_library_key=?').get(book.key) as {id:number};
      for(const author of book.author_name??[]){db.prepare('INSERT OR IGNORE INTO authors(name) VALUES(?)').run(author); const authorRow=db.prepare('SELECT id FROM authors WHERE name=?').get(author) as {id:number}; db.prepare('INSERT OR IGNORE INTO book_authors(book_id,author_id) VALUES(?,?)').run(bookRow.id,authorRow.id);}
      const tags=[subject,...(book.subject??[]).slice(0,8)];
      for(const tag of [...new Set(tags)]){const cleaned=tag.trim().slice(0,120);if(!cleaned)continue;db.prepare('INSERT OR IGNORE INTO subjects(name) VALUES(?)').run(cleaned);const sid=(db.prepare('SELECT id FROM subjects WHERE name=?').get(cleaned) as {id:number}).id;db.prepare('INSERT OR IGNORE INTO book_subjects(book_id,subject_id) VALUES(?,?)').run(bookRow.id,sid);}
      if(result.changes) db.prepare('INSERT OR IGNORE INTO activity_log(event_type,message) VALUES(?,?)').run('book:created',`Imported “${book.title}” from Open Library`);
    }
  }); save(payload.docs??[]);
}
async function main(){
  console.log('Fetching real catalogue records from Open Library. This can take a few minutes.');
  let succeeded=0; for(const subject of subjects){try{await fetchSubject(subject);succeeded++;console.log(`✓ ${subject}`);}catch(error){console.error(`Could not seed ${subject}:`,error instanceof Error?error.message:error);}}
  if(!succeeded) throw new Error('No Open Library subjects could be fetched. Check your internet connection and rerun npm run seed. No dummy data was inserted.');
  const hierarchy=db.transaction(()=>{for(const [child,parent] of Object.entries(parentMap)){db.prepare('INSERT OR IGNORE INTO subjects(name) VALUES(?)').run(parent);db.prepare('INSERT OR IGNORE INTO subjects(name) VALUES(?)').run(child);const p=(db.prepare('SELECT id FROM subjects WHERE name=?').get(parent) as {id:number}).id;db.prepare('UPDATE subjects SET broader_id=? WHERE name=?').run(p,child);}});hierarchy();
  const inferred=inferFacts(db); logActivity('seed:complete',`Catalogue seed completed from Open Library; ${inferred.length} subject-inheritance facts inferred.`);
  console.log(`Seed complete: ${(db.prepare('SELECT COUNT(*) AS n FROM books').get() as {n:number}).n} real books, ${(db.prepare('SELECT COUNT(*) AS n FROM subjects').get() as {n:number}).n} subjects, ${inferred.length} inferred facts.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
