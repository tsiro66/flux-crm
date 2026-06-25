import { describe, it, expect } from 'vitest';
import { parseCsv, toCsv } from '$lib/server/csv';

describe('parseCsv', () => {
	it('parses rows with headers', () => {
		const csv = 'name,email,phone\nAcme,a@b.com,123\nFoo,foo@bar.com,456\n';
		const { rows, errors } = parseCsv(Buffer.from(csv));
		expect(errors).toHaveLength(0);
		expect(rows).toHaveLength(2);
		expect(rows[0]).toEqual({ name: 'Acme', email: 'a@b.com', phone: '123' });
		expect(rows[1]).toEqual({ name: 'Foo', email: 'foo@bar.com', phone: '456' });
	});

	it('handles quoted fields with commas', () => {
		const csv = 'name,notes\n"Last, First","has, comma"\n';
		const { rows, errors } = parseCsv(Buffer.from(csv));
		expect(errors).toHaveLength(0);
		expect(rows[0].name).toBe('Last, First');
		expect(rows[0].notes).toBe('has, comma');
	});

	it('handles embedded newlines in quoted fields', () => {
		const csv = 'name,notes\nAcme,"line1\nline2"\n';
		const { rows, errors } = parseCsv(Buffer.from(csv));
		expect(errors).toHaveLength(0);
		expect(rows).toHaveLength(1);
		expect(rows[0].notes).toBe('line1\nline2');
	});

	it('handles escaped quotes', () => {
		const csv = 'name,notes\nAcme,"she said ""hi"""\n';
		const { rows, errors } = parseCsv(Buffer.from(csv));
		expect(errors).toHaveLength(0);
		expect(rows[0].notes).toBe('she said "hi"');
	});

	it('skips empty lines', () => {
		const csv = 'name\nA\n\nB\n';
		const { rows } = parseCsv(Buffer.from(csv));
		expect(rows).toHaveLength(2);
		expect(rows.map((r) => r.name)).toEqual(['A', 'B']);
	});

	it('trims header whitespace', () => {
		const csv = 'name , email \nAcme,a@b.com\n';
		const { rows } = parseCsv(Buffer.from(csv));
		expect(rows[0]).toHaveProperty('name', 'Acme');
		expect(rows[0]).toHaveProperty('email', 'a@b.com');
	});

	it('returns empty rows for empty input', () => {
		const { rows, errors } = parseCsv(Buffer.from(''));
		expect(rows).toHaveLength(0);
		expect(errors).toHaveLength(0);
	});
});

describe('toCsv', () => {
	it('serializes objects with headers', () => {
		const csv = toCsv([
			{ name: 'Acme', email: 'a@b.com' },
			{ name: 'Foo', email: 'foo@bar.com' }
		]);
		const lines = csv.split('\n');
		expect(lines[0]).toBe('name,email');
		expect(lines[1]).toBe('Acme,a@b.com');
		expect(lines[2]).toBe('Foo,foo@bar.com');
	});

	it('quotes fields containing commas', () => {
		const csv = toCsv([{ name: 'Last, First', notes: 'hi' }]);
		expect(csv.split('\n')[1]).toBe('"Last, First",hi');
	});

	it('quotes fields containing quotes by escaping them', () => {
		const csv = toCsv([{ notes: 'she said "hi"' }]);
		expect(csv.split('\n')[1]).toBe('"she said ""hi"""');
	});

	it('round-trips through parseCsv', () => {
		const original = [
			{ name: 'Acme', email: 'a@b.com', notes: 'has, comma' },
			{ name: 'Foo', email: 'foo@bar.com', notes: 'plain' }
		];
		const { rows } = parseCsv(Buffer.from(toCsv(original)));
		expect(rows).toEqual(original);
	});
});
