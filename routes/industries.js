'use strict';

const express = require('express');

const db = require('../db');
const ExpressError = require('../expressError');

// ==================================================

const router = express.Router();

// --------------------------------------------------

// POST /industries
router.post('', async (req, res, next) => {
  try {
    const { code, industry } = req.body;

    const results = await db.query(
      `INSERT INTO industries (code, industry)
      VALUES ($1, $2)
      RETURNING code, industry;`,
      [code, industry]
    );

    return res.status(201).json({ industry: results.rows[0] });
  } catch (err) {
    next(new ExpressError('Error when inserting into database.', 500));
  }
});

// GET /industries
router.get('', async (req, res, next) => {
  try {
    const results = await db.query(
      `SELECT i.code, i.industry, c.code AS comp_code
      FROM industries AS i
      LEFT JOIN companies_industries AS ci ON i.code = ci.industry_code
      LEFT JOIN companies AS c ON ci.comp_code = c.code;`
    );

    const industries = new Map();
    for (const row of results.rows) {
      const industry = industries.get(row.code) || {
        code: row.code,
        industry: row.industry,
        comp_codes: [],
      };

      industry.comp_codes.push(row.comp_code);

      industries.set(row.code, industry);
    }

    return res.json({
      industries: Array.from(industries.values()),
    });
  } catch (err) {
    next(new ExpressError('Error when querying database.', 500));
  }
});

// ==================================================

module.exports = router;
