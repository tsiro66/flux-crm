import Papa from 'papaparse';

export type CsvParseResult = {
	rows: Record<string, string>[];
	errors: string[];
};

export function parseCsv(buffer: Buffer): CsvParseResult {
	const text = buffer.toString('utf-8');
	if (text.trim() === '') return { rows: [], errors: [] };
	const result = Papa.parse<Record<string, string>>(text, {
		header: true,
		skipEmptyLines: true,
		transformHeader: (h) => h.trim()
	});
	const errors = result.errors.map((e) => `Row ${e.row ?? '?'}: ${e.message}`);
	return { rows: result.data, errors };
}

export function toCsv(rows: object[]): string {
	return Papa.unparse(rows, { newline: '\n' });
}

export function csvResponse(filename: string, csv: string): Response {
	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
}
