import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Path to our JSON "database" file
const DB_PATH = path.join(process.cwd(), 'db', 'searches.json');

// Ensure the db directory exists
async function ensureDbExists() {
  try {
    const dbDir = path.join(process.cwd(), 'db');
    try {
      await fs.access(dbDir);
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(dbDir, { recursive: true });
    }
    
    try {
      await fs.access(DB_PATH);
    } catch {
      // File doesn't exist, create it with empty array
      await fs.writeFile(DB_PATH, JSON.stringify([]));
    }
  } catch (error) {
    console.error('Error ensuring database exists:', error);
  }
}

// Read the current database
async function readDb() {
  await ensureDbExists();
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return [];
  }
}

// Write to the database
async function writeDb(data: any[]) {
  await ensureDbExists();
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing to database:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.query || !body.result) {
      return NextResponse.json({ error: 'Query and result are required' }, { status: 400 });
    }
    
    // Create a new search record
    const newSearch = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      query: body.query,
      result: body.result,
      sources: body.sources || [],
      localFiles: body.localFiles || []
    };
    
    // Read current data, add new record, and write back
    const db = await readDb();
    db.push(newSearch);
    await writeDb(db);
    
    return NextResponse.json({ success: true, id: newSearch.id });
  } catch (error) {
    console.error('Error saving search result:', error);
    return NextResponse.json({ error: 'Failed to save search result' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const db = await readDb();
    return NextResponse.json({ searches: db });
  } catch (error) {
    console.error('Error retrieving search results:', error);
    return NextResponse.json({ error: 'Failed to retrieve search results' }, { status: 500 });
  }
} 