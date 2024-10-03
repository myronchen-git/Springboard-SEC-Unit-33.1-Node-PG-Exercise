'use strict';

const express = require('express');

const db = require('../db');
const ExpressError = require('../expressError');

// ==================================================

const router = express.Router();

// --------------------------------------------------

// GET /invoices
router.get('', async (req, res, next) => {
  try {
    const results = await db.query('SELECT id, comp_code FROM invoices;');
    return res.json({ invoices: results.rows });
  } catch (err) {
    next(new ExpressError('Error when querying database.', 500));
  }
});

// GET /invoices/[id]
router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;

    const results = await db.query(
      `SELECT invoices.id, invoices.amt, invoices.paid, invoices.add_date,
      invoices.paid_date, companies.code, companies.name, companies.description
      FROM invoices
      JOIN companies ON invoices.comp_code = companies.code
      WHERE invoices.id = $1;`,
      [id]
    );

    if (results.rows.length === 0) {
      return next(new ExpressError('Invoice not found.', 404));
    }

    const invoiceAndCompany = results.rows[0];

    return res.json({
      invoice: {
        id: invoiceAndCompany.id,
        amt: invoiceAndCompany.amt,
        paid: invoiceAndCompany.paid,
        add_date: invoiceAndCompany.add_date,
        paid_date: invoiceAndCompany.paid_date,
        company: {
          code: invoiceAndCompany.code,
          name: invoiceAndCompany.name,
          description: invoiceAndCompany.description,
        },
      },
    });
  } catch (err) {
    next(new ExpressError('Error when querying database.', 500));
  }
});

// POST /invoices
router.post('', async (req, res, next) => {
  try {
    const { comp_code, amt } = req.body;

    const results = await db.query(
      `INSERT INTO invoices (comp_code, amt)
      VALUES ($1, $2)
      RETURNING id, comp_code, amt, paid, add_date, paid_date;`,
      [comp_code, amt]
    );

    return res.status(201).json({ invoice: results.rows[0] });
  } catch (err) {
    next(new ExpressError('Error when inserting into database.', 500));
  }
});

// PUT /invoices/[id]
router.put('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    let { amt, paid } = req.body;

    let results = await db.query(
      'SELECT paid, paid_date FROM invoices WHERE id = $1',
      [id]
    );

    if (results.rows.length === 0) {
      return next(new ExpressError('Company not found.', 404));
    }

    const currentPaid = results.rows[0].paid;
    let paidDate = results.rows[0].paid_date;

    if (paid && !paidDate) {
      paidDate = new Date();
    } else if (paid === false) {
      paidDate = null;
    } else {
      paid = currentPaid;
    }

    results = await db.query(
      `UPDATE invoices
      SET amt = $1, paid = $2, paid_date = $3
      WHERE id = $4
      RETURNING id, comp_code, amt, paid, add_date, paid_date;`,
      [amt, paid, paidDate, id]
    );

    return res.json({ invoice: results.rows[0] });
  } catch (err) {
    next(new ExpressError('Error when updating database.', 500));
  }
});

// DELETE /invoices/[id]
router.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;

    const results = await db.query(
      `DELETE FROM invoices
      WHERE id = $1;`,
      [id]
    );

    if (results.rowCount === 0) {
      return next(new ExpressError('Invoice not found.', 404));
    }

    return res.json({ status: 'deleted' });
  } catch (err) {
    next(new ExpressError('Error when deleting from database.', 500));
  }
});

// ==================================================

module.exports = router;
