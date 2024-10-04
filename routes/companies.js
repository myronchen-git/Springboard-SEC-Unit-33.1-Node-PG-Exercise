'use strict';

const express = require('express');
const slugify = require('slugify');

const db = require('../db');
const ExpressError = require('../expressError');

// ==================================================

const router = express.Router();

// --------------------------------------------------

// GET /companies
router.get('', async (req, res, next) => {
  try {
    const results = await db.query('SELECT code, name FROM companies;');
    return res.json({ companies: results.rows });
  } catch (err) {
    next(new ExpressError('Error when querying database.', 500));
  }
});

// GET /companies/[code]
router.get('/:code', async (req, res, next) => {
  try {
    const code = req.params.code;

    const companyResults = await db.query(
      `SELECT c.code, c.name, c.description, i.industry
      FROM companies AS c
      LEFT JOIN companies_industries AS ci ON c.code = ci.comp_code
      LEFT JOIN industries AS i ON ci.industry_code = i.code
      WHERE c.code = $1;`,
      [code]
    );

    if (companyResults.rows.length === 0) {
      return next(new ExpressError('Company not found.', 404));
    }

    const { name, description } = companyResults.rows[0];
    let industries = companyResults.rows.map((row) => row.industry);
    if (industries[0] === null) {
      industries = [];
    }

    const invoiceResults = await db.query(
      'SELECT id FROM invoices WHERE comp_code = $1',
      [code]
    );

    const invoices = invoiceResults.rows.map((invoice) => invoice.id);

    return res.json({
      company: { code, name, description, industries, invoices },
    });
  } catch (err) {
    next(new ExpressError('Error when querying database.', 500));
  }
});

// POST /companies
router.post('', async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const code = slugify(name, { lower: true, strict: true });

    const results = await db.query(
      `INSERT INTO companies (code, name, description)
      VALUES ($1, $2, $3)
      RETURNING code, name, description;`,
      [code, name, description]
    );

    return res.status(201).json({ company: results.rows[0] });
  } catch (err) {
    next(new ExpressError('Error when inserting into database.', 500));
  }
});

// POST /companies/[code]/industries
router.post('/:code/industries', async (req, res, next) => {
  try {
    const code = req.params.code;
    const { industry_code } = req.body;

    const results = await db.query(
      `INSERT INTO companies_industries (comp_code, industry_code)
      VALUES ($1, $2)
      RETURNING comp_code, industry_code;`,
      [code, industry_code]
    );

    return res.status(201).json({
      company: { code: results.rows[0].comp_code },
      industry: { code: results.rows[0].industry_code },
    });
  } catch (err) {
    if (err.code === '23503') {
      next(new ExpressError('Company or industry code does not exist.', 404));
    } else {
      next(new ExpressError('Error when inserting into database.', 500));
    }
  }
});

// PUT /companies/[code]
router.put('/:code', async (req, res, next) => {
  try {
    const code = req.params.code;
    const { name, description } = req.body;

    const results = await db.query(
      `UPDATE companies
      SET name=$2, description=$3
      WHERE code=$1
      RETURNING code, name, description;`,
      [code, name, description]
    );

    if (results.rows.length === 0) {
      return next(new ExpressError('Company not found.', 404));
    }

    return res.json({ company: results.rows[0] });
  } catch (err) {
    next(new ExpressError('Error when updating database.', 500));
  }
});

// DELETE /companies/[code]
router.delete('/:code', async (req, res, next) => {
  try {
    const code = req.params.code;

    const results = await db.query(
      `DELETE FROM companies
      WHERE code = $1;`,
      [code]
    );

    if (results.rowCount === 0) {
      return next(new ExpressError('Company not found.', 404));
    }

    return res.json({ status: 'deleted' });
  } catch (err) {
    next(new ExpressError('Error when deleting from database.', 500));
  }
});

// ==================================================

module.exports = router;
