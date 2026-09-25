import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function parseXlsx(filePath) {
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);

  // Read workbook.xml to get sheet names and ids
  const workbookXml = await zip.file('xl/workbook.xml').async('text');
  const sheetMatches = [...workbookXml.matchAll(/<sheet\s+name="([^"]+)"\s+sheetId="([^"]+)"\s+r:id="([^"]+)"/g)];
  
  // Read shared strings if exists
  let sharedStrings = [];
  const sharedStringsFile = zip.file('xl/sharedStrings.xml');
  if (sharedStringsFile) {
    const ssXml = await sharedStringsFile.async('text');
    // Extract each <si>...</si>
    const siMatches = [...ssXml.matchAll(/<si>(.*?)<\/si>/gs)];
    sharedStrings = siMatches.map(m => {
      const tMatches = [...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)];
      return tMatches.map(t => decodeXml(t[1])).join('');
    });
  }

  // Read relationship to map r:id to target file
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('text');
  const relMatches = [...relsXml.matchAll(/<Relationship\s+Id="([^"]+)"\s+Type="[^"]*worksheet"\s+Target="([^"]+)"/g)];
  const relMap = new Map(relMatches.map(m => [m[1], m[2]]));

  const result = { fileName: path.basename(filePath), sheets: {} };

  for (const match of sheetMatches) {
    const sheetName = decodeXml(match[1]);
    const rId = match[3];
    const target = relMap.get(rId) || `worksheets/sheet${match[2]}.xml`;
    const targetPath = target.startsWith('xl/') ? target : `xl/${target.replace(/^\//, '')}`;
    const sheetFile = zip.file(targetPath);
    if (!sheetFile) {
      console.warn(`Sheet file not found: ${targetPath}`);
      continue;
    }

    const sheetXml = await sheetFile.async('text');
    const rows = parseSheetXml(sheetXml, sharedStrings);
    result.sheets[sheetName] = rows;
  }

  return result;
}

function parseSheetXml(xml, sharedStrings) {
  const rows = [];
  const rowMatches = [...xml.matchAll(/<row\s+r="(\d+)"[^>]*>(.*?)<\/row>/gs)];

  for (const rMatch of rowMatches) {
    const rowIndex = parseInt(rMatch[1], 10);
    const rowContent = rMatch[2];
    const cellMatches = [...rowContent.matchAll(/<c\s+r="([A-Z]+)(\d+)"(?:\s+s="[^"]*")?(?:\s+t="([^"]*)")?[^>]*>(.*?)<\/c>/gs)];
    
    const rowData = {};
    for (const cMatch of cellMatches) {
      const colLetter = cMatch[1];
      const colIndex = colLetterToIndex(colLetter);
      const cellType = cMatch[3];
      const cellBody = cMatch[4];

      let val = null;
      if (cellType === 'inlineStr') {
        const isMatch = cellBody.match(/<is>.*?<t[^>]*>(.*?)<\/t>.*?<\/is>/s);
        val = isMatch ? decodeXml(isMatch[1]) : '';
      } else if (cellType === 's') {
        const vMatch = cellBody.match(/<v>(.*?)<\/v>/);
        if (vMatch) {
          const idx = parseInt(vMatch[1], 10);
          val = sharedStrings[idx] ?? '';
        }
      } else if (cellType === 'b') {
        const vMatch = cellBody.match(/<v>(.*?)<\/v>/);
        val = vMatch && vMatch[1] === '1';
      } else {
        const vMatch = cellBody.match(/<v>(.*?)<\/v>/);
        if (vMatch) {
          const num = Number(vMatch[1]);
          val = isNaN(num) ? vMatch[1] : num;
        } else {
          // Check if there is <is><t> or plain <t>
          const tMatch = cellBody.match(/<t[^>]*>(.*?)<\/t>/s);
          if (tMatch) val = decodeXml(tMatch[1]);
        }
      }
      rowData[colIndex] = val;
    }

    // Convert rowData object to array
    const maxCol = Math.max(-1, ...Object.keys(rowData).map(Number));
    const rowArr = [];
    for (let c = 0; c <= maxCol; c++) {
      rowArr.push(rowData[c] ?? '');
    }
    rows.push(rowArr);
  }

  return rows;
}

function colLetterToIndex(letters) {
  let index = 0;
  for (let i = 0; i < letters.length; i++) {
    index = index * 26 + (letters.charCodeAt(i) - 64);
  }
  return index - 1; // 0-indexed
}

function decodeXml(str) {
  if (!str) return '';
  return str
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

async function run() {
  const dir = 'docs/export. 0800';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
  for (const f of files) {
    const res = await parseXlsx(path.join(dir, f));
    console.log(`\n=== File: ${f} ===`);
    console.log('Sheets found:', Object.keys(res.sheets));
    for (const [name, rows] of Object.entries(res.sheets)) {
      console.log(`  Sheet "${name}": ${rows.length} rows`);
      if (rows.length > 0) {
        console.log(`    Headers (first 8):`, rows[0].slice(0, 8));
        if (rows.length > 1) {
          console.log(`    Sample row 1 (first 8):`, rows[1].slice(0, 8));
        }
      }
    }
  }
}

run();
