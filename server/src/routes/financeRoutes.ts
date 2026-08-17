import { Router } from 'express';
import { FinanceController } from '../controllers/financeController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', FinanceController.getTransactions);
router.post('/', FinanceController.createTransaction);
router.put('/:id', FinanceController.updateTransaction);
router.delete('/:id', FinanceController.deleteTransaction);
router.get('/summary', FinanceController.getSummary);

export default router;
