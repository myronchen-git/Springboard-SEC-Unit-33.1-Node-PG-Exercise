'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');

const app = require('../app');
const db = require('../db');

// ==================================================

const company1Data = Object.freeze({
  code: 'co1',
  name: 'company1',
  description: 'abc',
});

const invoice1Data = Object.freeze({
  comp_code: company1Data.code,
  amt: 1,
});

let company1;

beforeEach(async () => {
  await db.query(
    `TRUNCATE TABLE companies_industries;
    TRUNCATE TABLE invoices;
    DELETE FROM companies;
    DELETE FROM industries;`
  );

  const results = await db.query(
    `INSERT INTO companies (code, name, description)
    VALUES ($1, $2, $3)
    RETURNING code, name, description;`,
    [company1Data.code, company1Data.name, company1Data.description]
  );

  company1 = results.rows[0];
});

afterAll(async () => {
  await db.end();
});

describe('GET /invoices', () => {
  const url = '/invoices';
  let invoice1;

  beforeEach(async () => {
    const results = await db.query(
      `INSERT INTO invoices (comp_code, amt)
      VALUES ($1, $2)
      RETURNING id, comp_code, amt, paid, add_date, paid_date;`,
      [invoice1Data.comp_code, invoice1Data.amt]
    );

    invoice1 = results.rows[0];
  });

  test('Gets a list of all invoices.', async () => {
    // Act
    const resp = await request(app).get(url);

    // Assert
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({
      invoices: [{ id: invoice1.id, comp_code: invoice1.comp_code }],
    });
  });
});

describe('GET /invoices/[id]', () => {
  let url;
  let invoice1;

  beforeEach(async () => {
    const results = await db.query(
      `INSERT INTO invoices (comp_code, amt)
      VALUES ($1, $2)
      RETURNING id, comp_code, amt, paid, add_date, paid_date;`,
      [invoice1Data.comp_code, invoice1Data.amt]
    );

    invoice1 = results.rows[0];
    url = `/invoices/${invoice1.id}`;
  });

  test('Gets all info for a specific invoice.', async () => {
    // Arrange
    const expectedData = { ...invoice1 };
    delete expectedData.comp_code;
    expectedData.add_date = expectedData.add_date.toJSON();
    expectedData.company = company1;

    // Act
    const resp = await request(app).get(url);

    // Assert
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ invoice: expectedData });
  });

  test('Gets 404 when the invoice is not found.', async () => {
    // Arrange
    const url = `/invoices/99`;

    // Act
    const resp = await request(app).get(url);

    // Assert
    expect(resp.statusCode).toBe(404);
  });
});

describe('POST /invoices', () => {
  const url = '/invoices';

  test('Creates a new invoice.', async () => {
    // Act
    const resp = await request(app).post(url).send(invoice1Data);

    // Assert
    expect(resp.statusCode).toBe(201);

    const invoicesResults = await db.query(`SELECT * FROM invoices;`);
    expect(invoicesResults.rows.length).toBe(1);
    expect(invoicesResults.rows[0]).toEqual({
      id: expect.any(Number),
      comp_code: invoice1Data.comp_code,
      amt: invoice1Data.amt,
      paid: false,
      add_date: expect.any(Date),
      paid_date: null,
    });
  });
});

describe('PUT /invoices/[id]', () => {
  let url;
  let invoice1;

  beforeEach(async () => {
    const results = await db.query(
      `INSERT INTO invoices (comp_code, amt)
      VALUES ($1, $2)
      RETURNING id, comp_code, amt, paid, add_date, paid_date;`,
      [invoice1Data.comp_code, invoice1Data.amt]
    );

    invoice1 = results.rows[0];
    url = `/invoices/${invoice1.id}`;
  });

  test('Updates an existing invoice without paid argument.', async () => {
    // Arrange
    const updatedData = Object.freeze({ amt: 99 });
    const expectedRawData = { ...invoice1, ...updatedData };
    const expectedJsonData = { ...expectedRawData };
    expectedJsonData.add_date = expectedJsonData.add_date.toJSON();

    // Act
    const resp = await request(app).put(url).send(updatedData);

    // Assert
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ invoice: expectedJsonData });

    const invoicesResults = await db.query(`SELECT * FROM invoices;`);
    expect(invoicesResults.rows.length).toBe(1);
    expect(invoicesResults.rows[0]).toEqual(expectedRawData);
  });

  test('Updates an existing invoice with paid.', async () => {
    // Arrange
    const updatedData = Object.freeze({ amt: 99, paid: true });

    const expectedRawData = { ...invoice1, ...updatedData };
    expectedRawData.paid_date = expect.any(Date);

    const expectedJsonData = { ...expectedRawData };
    expectedJsonData.add_date = expectedJsonData.add_date.toJSON();
    expectedJsonData.paid_date = expect.any(String);

    // Act
    const resp = await request(app).put(url).send(updatedData);

    // Assert
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ invoice: expectedJsonData });

    const invoicesResults = await db.query(`SELECT * FROM invoices;`);
    expect(invoicesResults.rows.length).toBe(1);
    expect(invoicesResults.rows[0]).toEqual(expectedRawData);
  });

  test('Updates an existing invoice with unpaid.', async () => {
    // Arrange
    await db.query(
      `UPDATE invoices
      SET paid = true, paid_date = $1`,
      [new Date()]
    );

    const updatedData = Object.freeze({ amt: 99, paid: false });
    const expectedRawData = { ...invoice1, ...updatedData };
    const expectedJsonData = { ...expectedRawData };
    expectedJsonData.add_date = expectedJsonData.add_date.toJSON();

    // Act
    const resp = await request(app).put(url).send(updatedData);

    // Assert
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ invoice: expectedJsonData });

    const invoicesResults = await db.query(`SELECT * FROM invoices;`);
    expect(invoicesResults.rows.length).toBe(1);
    expect(invoicesResults.rows[0]).toEqual(expectedRawData);
  });

  test('Gets 404 when the invoice is not found.', async () => {
    // Arrange
    const url = `/invoices/99`;
    const updatedData = Object.freeze({ amt: 99 });

    // Act
    const resp = await request(app).put(url).send(updatedData);

    // Assert
    expect(resp.statusCode).toBe(404);

    const invoicesResults = await db.query(`SELECT * FROM invoices;`);
    expect(invoicesResults.rows.length).toBe(1);
    expect(invoicesResults.rows[0]).toEqual(invoice1);
  });
});

describe('DELETE /invoices/[id]', () => {
  let url;
  let invoice1;

  beforeEach(async () => {
    const results = await db.query(
      `INSERT INTO invoices (comp_code, amt)
      VALUES ($1, $2)
      RETURNING id, comp_code, amt, paid, add_date, paid_date;`,
      [invoice1Data.comp_code, invoice1Data.amt]
    );

    invoice1 = results.rows[0];
    url = `/invoices/${invoice1.id}`;
  });

  test('Deletes an existing invoice.', async () => {
    // Act
    const resp = await request(app).delete(url);

    // Assert
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ status: 'deleted' });

    const companiesResults = await db.query(`SELECT * FROM invoices;`);
    expect(companiesResults.rows.length).toBe(0);
  });

  test('Gets 404 when the invoice is not found.', async () => {
    // Arrange
    const url = `/invoices/99`;

    // Act
    const resp = await request(app).delete(url);

    // Assert
    expect(resp.statusCode).toBe(404);

    const invoicesResults = await db.query(`SELECT * FROM invoices;`);
    expect(invoicesResults.rows.length).toBe(1);
    expect(invoicesResults.rows[0]).toEqual(invoice1);
  });
});
