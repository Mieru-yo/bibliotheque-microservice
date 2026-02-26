const { Router } = require('express');
const loanController = require('../controller/loanController');
const { authenticate } = require('../middleware/auth');

const router = Router();

/**
 * @openapi
 * /api/v1/books/loans:
 *   get:
 *     tags: [Loans]
 *     summary: Get current user's loans
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user loans
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/loans', authenticate, loanController.getUserLoans);

/**
 * @openapi
 * /api/v1/books/{id}/borrow:
 *   post:
 *     tags: [Loans]
 *     summary: Borrow a book
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Book ID
 *     responses:
 *       201:
 *         description: Book borrowed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Book not found
 *       409:
 *         description: No copies available or already borrowed
 */
router.post('/:id/borrow', authenticate, loanController.borrow);

/**
 * @openapi
 * /api/v1/books/{id}/return:
 *   post:
 *     tags: [Loans]
 *     summary: Return a borrowed book
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Book ID
 *     responses:
 *       200:
 *         description: Book returned successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active loan found
 */
router.post('/:id/return', authenticate, loanController.returnBook);

module.exports = router;
