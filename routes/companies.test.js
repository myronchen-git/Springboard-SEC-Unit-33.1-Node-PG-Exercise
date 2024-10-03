'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');

const app = require('../app');
const db = require('../db');

// ==================================================

const company1Data = Object.freeze({
  code: 'company-1-incorp',
  name: 'company 1 Incorp.',
  description: 'abc',
});

const invoice1Data = Object.freeze({
  comp_code: company1Data.code,
  amt: 1,
});

beforeEach(async () => {
  await db.query('TRUNCATE TABLE invoices; DELETE FROM companies;');
});

afterAll(async () => {
  await db.end();
});

describe('GET /companies', () => {
  const url = '/companies';
  let company1;

  beforeEach(async () => {
    const results = await db.query(
      `INSERT INTO companies (code, name, description)
      VALUES ($1, $2, $3)
      RETURNING code, name;`,
      [company1Data.code, company1Data.name, company1Data.description]
    );

    company1 = results.rows[0];
  });

  test('Gets a list of all companies.', async () => {
    // Act
    const resp = await request(app).get(url);

    // Assert
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ companies: [company1] });
  });
});

describe('GET /companies/[code]', () => {
  const url = `/companies/${company1Data.code}`;
  let company1;
  let invoice1;

  beforeEach(async () => {
    let results = await db.query(
      `INSERT INTO companies (code, name, description)
      VALUES ($1, $2, $3)
      RETURNING code, name, description;`,
      [company1Data.code, company1Data.name, company1Data.description]
    );
    company1 = results.rows[0];

    results = await db.query(
      `INSERT INTO invoices (comp_code, amt)
      VALUES ($1, $2)
      RETURNING id;`,
      [invoice1Data.comp_code, invoice1Data.amt]
    );
    invoice1 = results.rows[0];
  });

  test('Gets all info for a specific company.', async () => {
    // Act
    const resp = await request(app).get(url);

    // Assert
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({
      company: { ...company1, invoices: [invoice1.id] },
    });
  });

  test('Gets 404 when the company is not found.', async () => {
    // Arrange
    const url = `/companies/99`;

    // Act
    const resp = await request(app).get(url);

    // Assert
    expect(resp.statusCode).toBe(404);
  });
});

describe('POST /companies', () => {
  const url = '/companies';

  test('Creates a new company.', async () => {
    // Arrange
    const data = {
      name: company1Data.name,
      description: company1Data.description,
    };

    // Act
    const resp = await request(app).post(url).send(data);

    // Assert
    expect(resp.statusCode).toBe(201);
    expect(resp.body).toEqual({ company: company1Data });

    const companiesResults = await db.query(`SELECT * FROM companies;`);
    expect(companiesResults.rows.length).toBe(1);
    expect(companiesResults.rows[0]).toEqual(company1Data);
  });
});

describe('PUT /companies/[code]', () => {
  const url = `/companies/${company1Data.code}`;
  let company1;

  beforeEach(async () => {
    const results = await db.query(
      `INSERT INTO companies (code, name, description)
      VALUES ($1, $2, $3)
      RETURNING code, name, description;`,
      [company1Data.code, company1Data.name, company1Data.description]
    );

    company1 = results.rows[0];
  });

  test('Updates an existing company.', async () => {
    // Arrange
    const updatedData = Object.freeze({
      name: 'new name',
      description: 'new description',
    });
    const expectedData = { ...company1, ...updatedData };

    // Act
    const resp = await request(app).put(url).send(updatedData);

    // Assert
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ company: expectedData });

    const companiesResults = await db.query(`SELECT * FROM companies;`);
    expect(companiesResults.rows.length).toBe(1);
    expect(companiesResults.rows[0]).toEqual(expectedData);
  });

  test('Gets 404 when the company is not found.', async () => {
    // Arrange
    const url = `/companies/99`;
    const updatedData = Object.freeze({
      name: 'new name',
      description: 'new description',
    });

    // Act
    const resp = await request(app).put(url).send(updatedData);

    // Assert
    expect(resp.statusCode).toBe(404);

    const companiesResults = await db.query(`SELECT * FROM companies;`);
    expect(companiesResults.rows.length).toBe(1);
    expect(companiesResults.rows[0]).toEqual(company1);
  });
});

describe('DELETE /companies/[code]', () => {
  const url = `/companies/${company1Data.code}`;
  let company1;

  beforeEach(async () => {
    const results = await db.query(
      `INSERT INTO companies (code, name, description)
      VALUES ($1, $2, $3)
      RETURNING code, name, description;`,
      [company1Data.code, company1Data.name, company1Data.description]
    );

    company1 = results.rows[0];
  });

  test('Deletes an existing company.', async () => {
    // Act
    const resp = await request(app).delete(url);

    // Assert
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ status: 'deleted' });

    const companiesResults = await db.query(`SELECT * FROM companies;`);
    expect(companiesResults.rows.length).toBe(0);
  });

  test('Gets 404 when the company is not found.', async () => {
    // Arrange
    const url = `/companies/99`;

    // Act
    const resp = await request(app).delete(url);

    // Assert
    expect(resp.statusCode).toBe(404);

    const companiesResults = await db.query(`SELECT * FROM companies;`);
    expect(companiesResults.rows.length).toBe(1);
    expect(companiesResults.rows[0]).toEqual(company1);
  });
});
