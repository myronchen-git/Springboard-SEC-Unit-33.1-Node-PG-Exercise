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

const industry1Data = Object.freeze({
  code: 'ind1',
  industry: 'Industry 1',
});

beforeEach(async () => {
  await db.query(
    `TRUNCATE TABLE companies_industries;
    TRUNCATE TABLE invoices;
    DELETE FROM companies;
    DELETE FROM industries;`
  );
});

afterAll(async () => {
  await db.end();
});

describe('POST /industries', () => {
  const url = '/industries';

  test('Creates a new industry.', async () => {
    // Act
    const resp = await request(app).post(url).send(industry1Data);

    // Assert
    expect(resp.statusCode).toBe(201);

    const industriesResults = await db.query(`SELECT * FROM industries;`);
    expect(industriesResults.rows.length).toBe(1);
    expect(industriesResults.rows[0]).toEqual(industry1Data);
  });
});

describe('GET /industries', () => {
  const url = '/industries';
  let company1;
  let industry1;

  beforeEach(async () => {
    let results = await db.query(
      `INSERT INTO companies (code, name, description)
      VALUES ($1, $2, $3)
      RETURNING code, name, description;`,
      [company1Data.code, company1Data.name, company1Data.description]
    );
    company1 = results.rows[0];

    results = await db.query(
      `INSERT INTO industries
      VALUES ($1, $2)
      RETURNING code, industry;`,
      [industry1Data.code, industry1Data.industry]
    );
    industry1 = results.rows[0];

    await db.query(
      `INSERT INTO companies_industries
      VALUES ($1, $2);`,
      [company1Data.code, industry1Data.code]
    );
  });

  test('Gets a list of all industries.', async () => {
    // Act
    const resp = await request(app).get(url);

    // Assert
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({
      industries: [{ ...industry1, comp_codes: [company1.code] }],
    });
  });
});
