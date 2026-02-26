const loanRepository = require('../repository/loanRepository');
const bookRepository = require('../repository/bookRepository');
const { booksBorrowedTotal } = require('../config/metrics');

class LoanService {
  async borrowBook(bookId, userId) {
    const book = await bookRepository.findById(bookId);
    if (!book) {
      const error = new Error('Book not found');
      error.status = 404;
      throw error;
    }

    if (book.available_copies <= 0) {
      const error = new Error('Book is not available');
      error.status = 409;
      throw error;
    }

    const existingLoan = await loanRepository.findActiveByBookId(bookId);
    if (existingLoan && existingLoan.user_id === userId) {
      const error = new Error('You already have an active loan for this book');
      error.status = 409;
      throw error;
    }

    const loan = await loanRepository.save({ book_id: bookId, user_id: userId });
    await bookRepository.decrementAvailable(bookId);
    booksBorrowedTotal.inc();

    return loan;
  }

  async returnBook(bookId, userId) {
    const book = await bookRepository.findById(bookId);
    if (!book) {
      const error = new Error('Book not found');
      error.status = 404;
      throw error;
    }

    const activeLoan = await loanRepository.findActiveByBookId(bookId);
    if (!activeLoan || activeLoan.user_id !== userId) {
      const error = new Error('No active loan found for this book and user');
      error.status = 404;
      throw error;
    }

    const returned = await loanRepository.save({
      id: activeLoan.id,
      status: 'RETURNED',
      returned_at: new Date(),
    });
    await bookRepository.incrementAvailable(bookId);

    return returned;
  }

  async getUserLoans(userId) {
    return loanRepository.findByUserId(userId);
  }
}

module.exports = new LoanService();
