import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data', 'users.db');
const db = new Database(dbPath);

try {
  // Get or create author (Noviox dev)
  let author = db.prepare('SELECT id FROM users WHERE username = ?').get('Noviox dev');
  
  if (!author) {
    // Create admin user if doesn't exist
    const userId = randomUUID();
    const now = Date.now();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, username, created_at, updated_at, is_admin)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, 'noviox@dev.local', 'placeholder', 'Noviox dev', now, now, 1);
    author = { id: userId };
    console.log('Created Noviox dev user');
  }

  // Add changelog post
  const postId = randomUUID();
  const now = Date.now();
  const title = 'Hey Guys';
  const content = 'First post. Update the proxy so we now support: Instagram Youtube (no signin) Spotify Discord GeForce NOW Gemini Clash Royale Brawl Stars Fortnite google (no signin) Roblox';
  
  db.prepare(`
    INSERT INTO changelog (id, title, content, author_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(postId, title, content, author.id, now);
  
  console.log('✓ Post added successfully!');
  console.log(`ID: ${postId}`);
  console.log(`Title: ${title}`);
  console.log(`Author: Noviox dev`);
  console.log(`Date: ${new Date(now).toLocaleString()}`);
  
  process.exit(0);
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
