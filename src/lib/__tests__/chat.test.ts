import { describe, it, expect } from 'vitest';
import { stripTags, renderMarkdown } from '$lib/utils/chat';

describe('stripTags', () => {
	it('removes function tags from text', () => {
		expect(stripTags('<function>list_clients</function>')).toBe('list_clients');
	});

	it('removes self-closing function tags', () => {
		expect(stripTags('text <function/list_clients> more')).toBe('text  more');
	});

	it('removes closing function tags', () => {
		expect(stripTags('hello</function>world')).toBe('helloworld');
	});

	it('returns clean text unchanged', () => {
		expect(stripTags('no tags here')).toBe('no tags here');
	});

	it('trims surrounding whitespace', () => {
		expect(stripTags('  hello  ')).toBe('hello');
	});

	it('handles empty string', () => {
		expect(stripTags('')).toBe('');
	});
});

describe('renderMarkdown', () => {
	it('renders bullet lists', () => {
		const result = renderMarkdown('- item one\n- item two');
		expect(result).toContain('<ul>');
		expect(result).toContain('<li>item one</li>');
		expect(result).toContain('<li>item two</li>');
	});

	it('renders bold text', () => {
		const result = renderMarkdown('**bold**');
		expect(result).toContain('<strong>bold</strong>');
	});

	it('renders code blocks', () => {
		const result = renderMarkdown('```\nconst x = 1;\n```');
		expect(result).toContain('<code>');
	});

	it('sanitizes dangerous script tags', () => {
		const result = renderMarkdown('<script>alert("xss")</script>');
		expect(result).not.toContain('<script>');
	});

	it('sanitizes onclick handlers', () => {
		const result = renderMarkdown('<a href="#" onclick="alert(1)">link</a>');
		expect(result).not.toContain('onclick');
	});

	it('renders plain text as a paragraph', () => {
		const result = renderMarkdown('hello world');
		expect(result).toContain('hello world');
	});
});
