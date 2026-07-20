import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data.json');

function loadDB() {
  if (existsSync(DB_PATH)) {
    return JSON.parse(readFileSync(DB_PATH, 'utf8'));
  }
  return { stories: [], pages: [], _seq: { stories: 0, pages: 0 } };
}

function saveDB(db) {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function initDB() {
  const db = loadDB();
  return {
    prepare(sql) {
      const insertMatch = sql.match(/INSERT INTO (\w+) \((.+?)\) VALUES \((.+?)\)/i);
      const selectMatch = sql.match(/SELECT \* FROM (\w+)(?: WHERE (\w+) = \?)?(?: ORDER BY (\w+))?/i);
      const deleteMatch = sql.match(/DELETE FROM (\w+) WHERE (\w+) = \?/i);

      if (insertMatch) {
        const [, table, cols, vals] = insertMatch;
        const colList = cols.split(',').map(s => s.trim());
        return {
          run(...args) {
            const row = {};
            colList.forEach((c, i) => row[c] = args[i]);
            if (table === 'stories') {
              row.id = ++db._seq.stories;
              row.created_at = new Date().toISOString();
              db.stories.push(row);
            } else if (table === 'pages') {
              row.id = ++db._seq.pages;
              db.pages.push(row);
            }
            saveDB(db);
            return { lastInsertRowid: row.id };
          }
        };
      }

      if (selectMatch) {
        const [, table, whereCol, orderBy] = selectMatch;
        return {
          all(...args) {
            let rows = table === 'stories' ? [...db.stories] : db.pages.filter(p => {
              if (whereCol === 'story_id') return p.story_id === args[0];
              return true;
            });
            if (orderBy) rows.sort((a, b) => {
              if (orderBy === 'created_at') return new Date(b.created_at) - new Date(a.created_at);
              if (orderBy === 'page_num') return a.page_num - b.page_num;
              return 0;
            });
            return rows;
          },
          get(...args) {
            if (table === 'stories') return db.stories.find(s => s.id === args[0]) || null;
            if (table === 'pages') return db.pages.find(p => p.id === args[0]) || null;
            return null;
          }
        };
      }

      if (deleteMatch) {
        const [, table, whereCol] = deleteMatch;
        return {
          run(...args) {
            if (table === 'stories') {
              db.stories = db.stories.filter(s => s.id !== args[0]);
              db.pages = db.pages.filter(p => p.story_id !== args[0]);
            }
            saveDB(db);
          }
        };
      }

      return { run() {}, all() { return []; }, get() { return null; } };
    },
    exec(sql) { return this; },
    pragma() {}
  };
}
