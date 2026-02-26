const LoanService = require('../src/service/loanService');
const loanRepository = require('../src/repository/loanRepository');
const bookRepository = require('../src/repository/bookRepository');

jest.mock('../src/repository/loanRepository');
jest.mock('../src/repository/bookRepository');
jest.mock('../src/config/metrics', () => ({
  booksBorrowedTotal: { inc: jest.fn() },
  dbQueryDuration: { startTimer: jest.fn(() => jest.fn()) },
}));

describe('LoanService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('borrowBook', () => {
    it('should create a loan when book is available', async () => {
      const book = { id: 'book-1', title: 'Test', available_copies: 2 };
      const loan = { id: 'loan-1', book_id: 'book-1', user_id: 'user-1', status: 'ACTIVE' };

      bookRepository.findById.mockResolvedValue(book);
      loanRepository.findActiveByBookId.mockResolvedValue(null);
      loanRepository.save.mockResolvedValue(loan);
      bookRepository.decrementAvailable.mockResolvedValue({ ...book, available_copies: 1 });

      const result = await LoanService.borrowBook('book-1', 'user-1');
      expect(result).toEqual(loan);
      expect(bookRepository.decrementAvailable).toHaveBeenCalledWith('book-1');
    });

    it('should throw 404 when book not found', async () => {
      bookRepository.findById.mockResolvedValue(null);

      await expect(LoanService.borrowBook('book-999', 'user-1')).rejects.toMatchObject({
        message: 'Book not found',
        status: 404,
      });
    });

    it('should throw 409 when book is not available', async () => {
      bookRepository.findById.mockResolvedValue({ id: 'book-1', available_copies: 0 });

      await expect(LoanService.borrowBook('book-1', 'user-1')).rejects.toMatchObject({
        message: 'Book is not available',
        status: 409,
      });
    });

    it('should throw 409 when user already has active loan', async () => {
      bookRepository.findById.mockResolvedValue({ id: 'book-1', available_copies: 1 });
      loanRepository.findActiveByBookId.mockResolvedValue({ user_id: 'user-1', status: 'ACTIVE' });

      await expect(LoanService.borrowBook('book-1', 'user-1')).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe('returnBook', () => {
    it('should return a borrowed book', async () => {
      const book = { id: 'book-1', available_copies: 0 };
      const activeLoan = { id: 'loan-1', book_id: 'book-1', user_id: 'user-1', status: 'ACTIVE' };
      const returnedLoan = { ...activeLoan, status: 'RETURNED', returned_at: expect.any(Date) };

      bookRepository.findById.mockResolvedValue(book);
      loanRepository.findActiveByBookId.mockResolvedValue(activeLoan);
      loanRepository.save.mockResolvedValue(returnedLoan);
      bookRepository.incrementAvailable.mockResolvedValue({ ...book, available_copies: 1 });

      const result = await LoanService.returnBook('book-1', 'user-1');
      expect(result.status).toBe('RETURNED');
      expect(bookRepository.incrementAvailable).toHaveBeenCalledWith('book-1');
    });

    it('should throw 404 when no active loan found', async () => {
      bookRepository.findById.mockResolvedValue({ id: 'book-1' });
      loanRepository.findActiveByBookId.mockResolvedValue(null);

      await expect(LoanService.returnBook('book-1', 'user-1')).rejects.toMatchObject({
        status: 404,
      });
    });

    it('should throw 404 when loan belongs to different user', async () => {
      bookRepository.findById.mockResolvedValue({ id: 'book-1' });
      loanRepository.findActiveByBookId.mockResolvedValue({ user_id: 'user-2', status: 'ACTIVE' });

      await expect(LoanService.returnBook('book-1', 'user-1')).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('getUserLoans', () => {
    it('should return all loans for a user', async () => {
      const loans = [{ id: 'loan-1', book_title: 'Book 1' }];
      loanRepository.findByUserId.mockResolvedValue(loans);

      const result = await LoanService.getUserLoans('user-1');
      expect(result).toEqual(loans);
    });
  });
});
