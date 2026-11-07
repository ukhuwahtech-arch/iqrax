import { NextResponse } from 'next/server';
import path from 'path';
// @ts-ignore
import { DatabaseSync } from 'node:sqlite';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> }
) {
  const resolvedParams = await params;
  const pageNumber = parseInt(resolvedParams.page);
  
  if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > 604) {
    return NextResponse.json({ error: 'Invalid page number' }, { status: 400 });
  }

  // Cross-platform database path (works locally and on Vercel monorepo structure)
  const dbPath = path.join(process.cwd(), '../../qpc-v2-15-lines.db');
  
  try {
    const database = new DatabaseSync(dbPath, { readOnly: true });
    
    const query = database.prepare(`
      SELECT line_number, line_type, is_centered, first_word_id, last_word_id, surah_number
      FROM pages 
      WHERE page_number = ? 
      ORDER BY line_number ASC
    `);
    
    const pageLines = query.all(pageNumber);

    const words: any[] = [];
    let currentSurah = 1;
    let currentAyah = 1;
    
    pageLines.forEach((line: any) => {
      if (line.surah_number && typeof line.surah_number === 'number') {
        currentSurah = line.surah_number;
      }

      const firstId = parseInt(line.first_word_id);
      const lastId = parseInt(line.last_word_id);

      if (!isNaN(firstId) && !isNaN(lastId) && firstId <= lastId) {
        for (let wordId = firstId; wordId <= lastId; wordId++) {
          const codeV2 = String.fromCharCode(0xE000 + wordId);

          words.push({
            id: wordId,
            line_number: line.line_number,
            position: wordId - firstId + 1,
            verse_key: `${currentSurah}:${currentAyah}`,
            code_v2: codeV2,
            char_type_name: 'word'
          });
        }
      } else {
        let headerText = '';
        if (line.line_type === 'surah_name') {
          headerText = `سُورَةُ الفَاتِحَة`;
        } else if (line.line_type === 'bismillah') {
          headerText = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
        }

        if (headerText) {
          words.push({
            id: line.line_number,
            line_number: line.line_number,
            position: 1,
            verse_key: `${currentSurah}:1`,
            code_v2: headerText,
            char_type_name: line.line_type,
            is_header: true
          });
        }
      }
    });

    return NextResponse.json({ page: pageNumber, words, layout: pageLines });
  } catch (error) {
    console.error('Built-in SQLite query error:', error);
    return NextResponse.json({ error: 'Failed to load page layout from database' }, { status: 500 });
  }
}