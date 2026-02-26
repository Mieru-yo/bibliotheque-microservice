const bookRepository = require('../repository/bookRepository');

class BookService {
  async listBooks(filters) {
    if (filters.title) {
      const books = await bookRepository.findByTitleContaining(filters.title);
      return { data: books, total: books.length };
    }
    if (filters.author) {
      const books = await bookRepository.findByAuthorContaining(filters.author);
      return { data: books, total: books.length };
    }
    return bookRepository.findAll({ page: filters.page, size: filters.size, sort: filters.sort });
  }

  async getById(id) {
    const book = await bookRepository.findById(id);
    if (!book) {
      const error = new Error('Book not found');
      error.status = 404;
      throw error;
    }
    return book;
  }

  async create(data) {
    return bookRepository.save(data);
  }

  async update(id, data) {
    const existing = await bookRepository.findById(id);
    if (!existing) {
      const error = new Error('Book not found');
      error.status = 404;
      throw error;
    }
    return bookRepository.save({ ...data, id });
  }

  async delete(id) {
    const book = await bookRepository.deleteById(id);
    if (!book) {
      const error = new Error('Book not found');
      error.status = 404;
      throw error;
    }
    return book;
  }

  isAvailable(book) {
    return book.available_copies > 0;
  }
}

module.exports = new BookService();
