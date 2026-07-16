import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'words.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err);
  } else {
    console.log('Connected to SQLite words database at', dbPath);
  }
});

// Default categorized words to seed the database
const DEFAULT_WORDS = {
  Animals: [
    'dog', 'cat', 'elephant', 'tiger', 'lion', 'giraffe', 'zebra', 'monkey',
    'panda', 'penguin', 'dolphin', 'whale', 'shark', 'octopus', 'rabbit',
    'hamster', 'squirrel', 'koala', 'kangaroo', 'crocodile', 'dinosaur',
    'turtle', 'frog', 'butterfly', 'bee', 'owl', 'eagle', 'parrot', 'snake', 'fox'
  ],
  Food: [
    'apple', 'banana', 'pizza', 'burger', 'sushi', 'pasta', 'taco', 'salad',
    'cake', 'cookie', 'ice cream', 'donut', 'chocolate', 'cheese', 'bread',
    'potato', 'tomato', 'orange', 'strawberry', 'watermelon', 'grape', 'pineapple',
    'pancake', 'waffle', 'popcorn', 'sandwich', 'hotdog', 'soup', 'carrot', 'onion'
  ],
  Objects: [
    'table', 'chair', 'laptop', 'phone', 'book', 'pen', 'pencil', 'cup',
    'glass', 'clock', 'key', 'wallet', 'bag', 'umbrella', 'guitar', 'piano',
    'camera', 'shoe', 'shirt', 'hat', 'mirror', 'candle', 'pillow', 'blanket',
    'lamp', 'hammer', 'scissors', 'brush', 'soap', 'toothbrush'
  ],
  Places: [
    'house', 'school', 'hospital', 'park', 'beach', 'forest', 'desert', 'mountain',
    'river', 'ocean', 'castle', 'library', 'museum', 'airport', 'station',
    'bridge', 'tower', 'farm', 'garden', 'city', 'church', 'island', 'jungle',
    'playground', 'supermarket', 'bakery', 'restaurant', 'office', 'hotel', 'theater'
  ],
  Actions: [
    'running', 'jumping', 'swimming', 'flying', 'reading', 'writing', 'painting',
    'drawing', 'sleeping', 'eating', 'drinking', 'singing', 'dancing', 'cooking',
    'driving', 'climbing', 'laughing', 'crying', 'playing', 'cleaning', 'walking',
    'thinking', 'fishing', 'shopping', 'washing', 'sweeping', 'digging', 'yawning'
  ]
};

// Promisified DB functions
export const initDb = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create table
      db.run(`
        CREATE TABLE IF NOT EXISTS words (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word TEXT UNIQUE NOT NULL,
          category TEXT NOT NULL
        )
      `, (err) => {
        if (err) return reject(err);
      });

      // Check if table has data
      db.get('SELECT COUNT(*) as count FROM words', (err, row) => {
        if (err) return reject(err);

        if (row.count === 0) {
          console.log('Seeding default word database...');
          const stmt = db.prepare('INSERT OR IGNORE INTO words (word, category) VALUES (?, ?)');

          for (const [category, words] of Object.entries(DEFAULT_WORDS)) {
            for (const word of words) {
              stmt.run(word.toLowerCase().trim(), category);
            }
          }

          stmt.finalize((err) => {
            if (err) return reject(err);
            console.log('Database seeded successfully!');
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  });
};

export const getWordsByCategory = (category, limit = 100) => {
  return new Promise((resolve, reject) => {
    let query = 'SELECT word FROM words';
    let params = [];

    if (category && category !== 'Mixed') {
      query += ' WHERE category = ?';
      params.push(category);
    }

    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(limit);

    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(row => row.word));
    });
  });
};

export default db;
