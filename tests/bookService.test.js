const BookService = require('../src/service/bookService');
const bookRepository = require('../src/repository/bookRepository');

jest.mock('../src/repository/bookRepository');
jest.mock('../src/config/metrics', () => ({
  dbQueryDuration: { startTimer: jest.fn(() => jest.fn()) },
  booksBorrowedTotal: { inc: jest.fn() },
}));

describe('BookService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('listBooks', () => {
    it('should return paginated books', async () => {
      const mockResult = { data: [{ id: 'uuid-1', title: 'Test' }], total: 1, page: 1, size: 10 };
      bookRepository.findAll.mockResolvedValue(mockResult);

      const result = await BookService.listBooks({ page: 1, size: 10 });
      expect(result).toEqual(mockResult);
    });

    it('should filter by title', async () => {
      const books = [{ id: 'uuid-1', title: 'Node.js Guide' }];
      bookRepository.findByTitleContaining.mockResolvedValue(books);

      const result = await BookService.listBooks({ title: 'Node' });
      expect(result.data).toEqual(books);
      expect(bookRepository.findByTitleContaining).toHaveBeenCalledWith('Node');
    });

    it('should filter by author', async () => {
      const books = [{ id: 'uuid-1', author: 'John Doe' }];
      bookRepository.findByAuthorContaining.mockResolvedValue(books);

      const result = await BookService.listBooks({ author: 'John' });
      expect(result.data).toEqual(books);
    });
  });

  describe('getById', () => {
    it('should return a book when found', async () => {
      const book = { id: 'uuid-1', title: 'Test Book', available_copies: 1 };
      bookRepository.findById.mockResolvedValue(book);

      const result = await BookService.getById('uuid-1');
      expect(result).toEqual(book);
    });

    it('should throw 404 when book not found', async () => {
      bookRepository.findById.mockResolvedValue(null);

      await expect(BookService.getById('uuid-999')).rejects.toMatchObject({
        message: 'Book not found',
        status: 404,
      });
    });
  });

  describe('create', () => {
    it('should create and return a book', async () => {
      const data = { title: 'New Book', author: 'Author', isbn: '1234567890123', total_copies: 2 };
      const created = { id: 'uuid-1', ...data, available_copies: 2 };
      bookRepository.save.mockResolvedValue(created);

      const result = await BookService.create(data);
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update and return a book', async () => {
      bookRepository.findById.mockResolvedValue({ id: 'uuid-1', title: 'Old' });
      bookRepository.save.mockResolvedValue({ id: 'uuid-1', title: 'Updated' });

      const result = await BookService.update('uuid-1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('should throw 404 when updating non-existent book', async () => {
      bookRepository.findById.mockResolvedValue(null);

      await expect(BookService.update('uuid-999', { title: 'X' })).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('delete', () => {
    it('should delete a book', async () => {
      bookRepository.deleteById.mockResolvedValue({ id: 'uuid-1' });

      const result = await BookService.delete('uuid-1');
      expect(result.id).toBe('uuid-1');
    });

    it('should throw 404 when deleting non-existent book', async () => {
      bookRepository.deleteById.mockResolvedValue(null);

      await expect(BookService.delete('uuid-999')).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('isAvailable', () => {
    it('should return true when copies available', () => {
      expect(BookService.isAvailable({ available_copies: 3 })).toBe(true);
    });

    it('should return false when no copies available', () => {
      expect(BookService.isAvailable({ available_copies: 0 })).toBe(false);
    });
  });
});
