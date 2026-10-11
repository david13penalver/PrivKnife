import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseCsv,
  parseExcel,
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
    it('should correctly infer floating point decimals (e.g. 0.5, -0.25) as numbers and keep padded codes as strings', () => {
      const csv = 'code,rate,discount,balance\n007,0.5,-0.25,0\n0123,0.05,100,0.0';
      const table = parseCsv(csv);
      const jsonStr = tableToJson(table, { structure: 'arrayOfObjects', indent: 2 });
      const parsed = JSON.parse(jsonStr);

      expect(parsed[0].code).toBe('007'); // Leading zero preserved as string
      expect(parsed[0].rate).toBe(0.5); // 0.5 inferred as number
      expect(parsed[0].discount).toBe(-0.25); // -0.25 inferred as number
      expect(parsed[0].balance).toBe(0);

      expect(parsed[1].code).toBe('0123'); // Leading zero preserved as string
      expect(parsed[1].rate).toBe(0.05); // 0.05 inferred as number
      expect(parsed[1].discount).toBe(100);
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

    it('should format decimal numbers like 0.5 unquoted in SQL and keep leading-zero codes quoted', () => {
      const csv = 'code,rate,discount\n007,0.5,-0.25';
      const table = parseCsv(csv);
      const sql = tableToSql(table, { tableName: 'rates', dialect: 'mysql' });

      expect(sql).toContain("('007', 0.5, -0.25)");
    });

    it('should split SQL queries into batches when batchSize is specified', () => {
      const csv = 'id,val\n1,a\n2,b\n3,c\n4,d\n5,e';
      const table = parseCsv(csv);
      const sql = tableToSql(table, { tableName: 'items', dialect: 'mysql', batchSize: 2 });

      const statements = sql.split(';\n\n').map((s) => s.trim().replace(/;$/, ''));
      expect(statements).toHaveLength(3);
      expect(statements[0]).toContain('(1, \'a\'),\n  (2, \'b\')');
      expect(statements[1]).toContain('(3, \'c\'),\n  (4, \'d\')');
      expect(statements[2]).toContain('(5, \'e\')');
    });

    it('should respect postgres and sqlite identifier escaping', () => {
      const table = parseCsv(SAMPLE_CSV_DATA);
      const pgSql = tableToSql(table, { tableName: 'employees', dialect: 'postgres' });
      expect(pgSql).toContain('INSERT INTO "employees" ("id", "name", "role", "salary", "active") VALUES');
    });
  });

  describe('Excel (.xlsx / .xls) Parsing', () => {
    function createTestExcelBuffer(sheetData: Record<string, any[][]>): ArrayBuffer {
      const wb = XLSX.utils.book_new();
      for (const [sheetName, data] of Object.entries(sheetData)) {
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
      return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    }

    it('should parse single-sheet Excel workbook from ArrayBuffer', () => {
      const buffer = createTestExcelBuffer({
        Sheet1: [
          ['sku', 'name', 'price'],
          ['A101', 'Keyboard', 49.99],
          ['B202', 'Mouse', 24.5],
        ],
      });

      const table = parseExcel(buffer);
      expect(table.headers).toEqual(['sku', 'name', 'price']);
      expect(table.rowCount).toBe(2);
      expect(table.columnCount).toBe(3);
      expect(table.rows[0]).toEqual(['A101', 'Keyboard', '49.99']);
      expect(table.rows[1]).toEqual(['B202', 'Mouse', '24.5']);
      expect(table.sheetNames).toEqual(['Sheet1']);
      expect(table.activeSheet).toBe('Sheet1');
    });

    it('should extract all sheet names and parse specified sheet by index', () => {
      const buffer = createTestExcelBuffer({
        Employees: [
          ['id', 'name'],
          ['1', 'John'],
        ],
        Departments: [
          ['dept_id', 'dept_name'],
          ['D1', 'Engineering'],
          ['D2', 'Finance'],
        ],
      });

      const sheet0 = parseExcel(buffer, 0);
      expect(sheet0.sheetNames).toEqual(['Employees', 'Departments']);
      expect(sheet0.activeSheet).toBe('Employees');
      expect(sheet0.headers).toEqual(['id', 'name']);
      expect(sheet0.rowCount).toBe(1);

      const sheet1 = parseExcel(buffer, 1);
      expect(sheet1.activeSheet).toBe('Departments');
      expect(sheet1.headers).toEqual(['dept_id', 'dept_name']);
      expect(sheet1.rowCount).toBe(2);
    });

    it('should handle empty sheet or empty workbook without throwing', () => {
      const buffer = createTestExcelBuffer({
        EmptySheet: [],
      });

      const table = parseExcel(buffer);
      expect(table.rowCount).toBe(0);
      expect(table.columnCount).toBe(0);
      expect(table.headers).toEqual([]);
      expect(table.rows).toEqual([]);
      expect(table.sheetNames).toEqual(['EmptySheet']);
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
