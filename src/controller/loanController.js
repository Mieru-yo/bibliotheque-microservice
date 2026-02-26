const loanService = require('../service/loanService');

function respond(res, data, message = 'Success', status = 200) {
  res.status(status).json({ status, message, data, timestamp: new Date().toISOString() });
}

async function borrow(req, res, next) {
  try {
    const loan = await loanService.borrowBook(req.params.id, req.user.id);
    respond(res, loan, 'Book borrowed', 201);
  } catch (err) { next(err); }
}

async function returnBook(req, res, next) {
  try {
    const loan = await loanService.returnBook(req.params.id, req.user.id);
    respond(res, loan, 'Book returned');
  } catch (err) { next(err); }
}

async function getUserLoans(req, res, next) {
  try {
    const loans = await loanService.getUserLoans(req.user.id);
    respond(res, loans);
  } catch (err) { next(err); }
}

module.exports = { borrow, returnBook, getUserLoans };
