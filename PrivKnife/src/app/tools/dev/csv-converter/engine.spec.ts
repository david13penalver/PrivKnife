import { describe, expect, it } from 'vitest';
import {
  parseCsv,
  tableToJson,
  tableToMarkdown,
  tableToSql,
} from './engine';
import {
  COMPLEX_CSV_DATA,
  SAMPLE_CSV_DATA,
  SEMICOLON_CSV_DATA,
  TSV_DATA,
} from './test-fixtures';

describe('ConverterEngine (Seam 1: Pure Tabular Processing & Code Generation)', () => {
  describe('CSV & Delimiter Parsing', () => {
    it('should parse standard comma-delimited CSV text', () => {
      const table = parseCsv(SAMPLE_CSV_DATA);

      expect(table.headers).toEqual(['id', 'name', 'role', 'salary', 'active']);
      expect(table.rowCount).toBe(3);
      expect(table.columnCount).toBe(5);
      expect(table.rows[0]).toEqual(['1', 'Alice', 'Engineer', '95000', 'true']);
      expect(table.rows[2][2]).toBe('Product, Manager'); // Escaped comma preserved
    });

    it('should parse tab-delimited (TSV) text', () => {
      const table = parseCsv(TSV_DATA);

      expect(table.headers).toEqual(['sku', 'product', 'price']);
      expect(table.rowCount).toBe(2);
      expect(table.rows[0]).toEqual(['SKU-01', 'Laptop', '1200']);
    });

    it('should parse semicolon-delimited CSV text', () => {
      const table = parseCsv(SEMICOLON_CSV_DATA);

      expect(table.headers).toEqual(['id', 'title', 'views']);
      expect(table.rowCount).toBe(2);
      expect(table.rows[1]).toEqual(['2', 'Article Two', '3200']);
    });

    it('should parse complex quoted cells with newlines and escaped quotes', () => {
      const table = parseCsv(COMPLEX_CSV_DATA);

      expect(table.headers).toEqual(['id', 'description', 'quote']);
      expect(table.rows[0][1]).toBe('Line 1\nLine 2');
      expect(table.rows[0][2]).toBe('He said "Hello, World!"');
    });
  });

  describe('JSON Code Generation', () => {
    it('should convert table into an array of JSON objects', () => {
      const table = parseCsv(SAMPLE_CSV_DATA);
      const jsonStr = tableToJson(table, { structure: 'arrayOfObjects', indent: 2 });
      const parsed = JSON.parse(jsonStr);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(3);
      expect(parsed[0]).toEqual({
        id: 1,
        name: 'Alice',
        role: 'Engineer',
        salary: 95000,
        active: true,
      });
    });

    it('should convert table into a 2D Array format', () => {
      const table = parseCsv(SAMPLE_CSV_DATA);
      const jsonStr = tableToJson(table, { structure: 'twoDimensionalArray', indent: 0 });
      const parsed = JSON.parse(jsonStr);

      expect(parsed[0]).toEqual(['id', 'name', 'role', 'salary', 'active']);
      expect(parsed[1][1]).toBe('Alice');
    });
  });

  describe('SQL INSERT Code Generation', () => {
    it('should generate valid SQL INSERT statements with type inference and escaping', () => {
      const table = parseCsv(SAMPLE_CSV_DATA);
      const sql = tableToSql(table, { tableName: 'employees', dialect: 'mysql' });

      expect(sql).toContain('INSERT INTO `employees` (`id`, `name`, `role`, `salary`, `active`) VALUES');
      expect(sql).toContain('(1, \'Alice\', \'Engineer\', 95000, TRUE)');
      expect(sql).toContain('(2, \'Bob\', \'Designer\', 82000, FALSE)');
      expect(sql).toContain('(3, \'Charlie\', \'Product, Manager\', 105000, TRUE)');
    });

    it('should respect postgres and sqlite identifier escaping', () => {
      const table = parseCsv(SAMPLE_CSV_DATA);
      const pgSql = tableToSql(table, { tableName: 'employees', dialect: 'postgres' });
      expect(pgSql).toContain('INSERT INTO "employees" ("id", "name", "role", "salary", "active") VALUES');
    });
  });

  describe('GitHub-Flavored Markdown Generation', () => {
    it('should generate valid Markdown tables with alignment', () => {
      const table = parseCsv(SAMPLE_CSV_DATA);
      const mdLeft = tableToMarkdown(table, { alignment: 'left' });

      expect(mdLeft).toContain('| id | name | role | salary | active |');
      expect(mdLeft).toContain('| :--- | :--- | :--- | :--- | :--- |');
      expect(mdLeft).toContain('| 1 | Alice | Engineer | 95000 | true |');
    });

    it('should generate centered Markdown tables', () => {
      const table = parseCsv(SAMPLE_CSV_DATA);
      const mdCenter = tableToMarkdown(table, { alignment: 'center' });
      expect(mdCenter).toContain('| :---: | :---: | :---: | :---: | :---: |');
    });
  });
});
