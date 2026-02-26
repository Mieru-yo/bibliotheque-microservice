const bookService = require('../service/bookService');

function respond(res, data, message = 'Success', status = 200) {
  res.status(status).json({ status, message, data, timestamp: new Date().toISOString() });
}

async function list(req, res, next) {
  try {
    const { title, author, page = 1, size = 10, sort = 'created_at' } = req.query;
    const result = await bookService.listBooks({
      title, author, page: parseInt(page), size: parseInt(size), sort,
    });
    respond(res, result);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const book = await bookService.getById(req.params.id);
    respond(res, book);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { title, author, isbn, description, total_copies } = req.body;
    if (!title || !author) {
      return res.status(400).json({
        status: 400, message: 'Title and author are required', data: null, timestamp: new Date().toISOString(),
      });
    }
    const book = await bookService.create({ title, author, isbn, description, total_copies });
    respond(res, book, 'Book created', 201);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const book = await bookService.update(req.params.id, req.body);
    respond(res, book, 'Book updated');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await bookService.delete(req.params.id);
    respond(res, null, 'Book deleted');
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove };
