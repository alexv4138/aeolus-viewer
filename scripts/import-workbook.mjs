import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const root = process.cwd();
const source = process.argv[2] ?? path.join(root, 'TabelDateTurbine-1.xlsx');
const destination = path.join(root, 'public', 'telemetry.json');
const fields = ['IDLocatie', 'DataOra', 'TempC', 'PresAtm', 'Umiditate', 'VitVant', 'DirectieVant', 'RadSolara', 'Turatie', 'Voltaj', 'Amperaj', 'Putere', 'Energie', 'Vibratii', 'CupluMec', 'TempInfas', 'Alarma'];

if (!fs.existsSync(source)) throw new Error(`Fișier Excel inexistent: ${source}`);

const workbook = XLSX.readFile(source, { cellDates: false });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
const missing = fields.filter((field) => !Object.prototype.hasOwnProperty.call(rows[0] ?? {}, field));
if (missing.length) throw new Error(`Lipsesc coloane: ${missing.join(', ')}`);

function dateTime(value) {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) throw new Error(`Dată Excel invalidă: ${value}`);
    return `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}T${String(parsed.H).padStart(2, '0')}:${String(parsed.M).padStart(2, '0')}:${String(Math.round(parsed.S)).padStart(2, '0')}`;
  }
  return String(value);
}

const telemetry = rows.map((row) => {
  const point = { IDLocatie: Number(row.IDLocatie), DataOra: dateTime(row.DataOra) };
  for (const field of fields.slice(2)) point[field] = field === 'DirectieVant' ? String(row[field] ?? '') : Number(row[field]);
  return point;
}).sort((a, b) => a.IDLocatie - b.IDLocatie || a.DataOra.localeCompare(b.DataOra));

fs.writeFileSync(destination, JSON.stringify(telemetry));
console.log(`Importate ${telemetry.length} citiri în ${destination}`);
