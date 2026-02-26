const { Router } = require('express');
const bookController = require('../controller/bookController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = Router();

/**
 * @openapi
 * /api/v1/books:
 *   get:
 *     tags: [Books]
 *     summary: List books (paginated, filterable)
 *     parameters:
 *       - in: query
 *         name: title
 *         schema: { type: string }
 *         description: Filter by title (partial match)
 *       - in: query
 *         name: author
 *         schema: { type: string }
 *         description: Filter by author (partial match)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: created_at }
 *     responses:
 *       200:
 *         description: Paginated list of books
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/', bookController.list);

/**
 * @openapi
 * /api/v1/books/{id}:
 *   get:
 *     tags: [Books]
 *     summary: Get a book by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Book details
 *       404:
 *         description: Book not found
 */
router.get('/:id', bookController.getById);

/**
 * @openapi
 * /api/v1/books:
 *   post:
 *     tags: [Books]
 *     summary: Create a book (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, author]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Clean Code
 *               author:
 *                 type: string
 *                 example: Robert C. Martin
 *               isbn:
 *                 type: string
 *                 example: '9780132350884'
 *               description:
 *                 type: string
 *                 example: A Handbook of Agile Software Craftsmanship
 *               total_copies:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       201:
 *         description: Book created
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin only
 */
router.post('/', authenticate, requireAdmin, bookController.create);

/**
 * @openapi
 * /api/v1/books/{id}:
 *   put:
 *     tags: [Books]
 *     summary: Update a book (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               author: { type: string }
 *               isbn: { type: string }
 *               description: { type: string }
 *               total_copies: { type: integer }
 *     responses:
 *       200:
 *         description: Book updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Book not found
 */
router.put('/:id', authenticate, requireAdmin, bookController.update);

/**
 * @openapi
 * /api/v1/books/{id}:
 *   delete:
 *     tags: [Books]
 *     summary: Delete a book (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Book deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Book not found
 */
router.delete('/:id', authenticate, requireAdmin, bookController.remove);

module.exports = router;
