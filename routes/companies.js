'use strict';

const express = require('express');

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

    const results = await db.query(
      'SELECT code, name, description FROM companies WHERE code = $1;',
      [code]
    );

    if (results.rows.length === 0) {
      return next(new ExpressError('Company not found.', 404));
    }

    return res.json({ company: results.rows[0] });
  } catch (err) {
    // next(err);
    next(new ExpressError('Error when querying database.', 500));
  }
});

// POST /companies
router.post('', async (req, res, next) => {
  try {
    const { code, name, description } = req.body;

    const results = await db.query(
      `INSERT INTO companies (code, name, description)
      VALUES ($1, $2, $3)
      RETURNING code, name, description;`,
      [code, name, description]
    );

    return res.status(201).json({ company: results.rows[0] });
  } catch (err) {
    next('Error when inserting into database.', 500);
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
