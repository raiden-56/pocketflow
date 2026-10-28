import { z } from 'zod'
import { isValidIsoDate } from './dateFormatter'

export const transactionSchema = z.object({
  date: z
    .string()
    .min(1, 'Date is required')
    .refine((v) => isValidIsoDate(v), 'Enter a valid date'),
  description: z.string().trim().min(1, 'Description is required').max(200, 'Keep the description under 200 characters'),
  category: z.string().trim().min(1, 'Choose a category'),
  type: z.enum(['Income', 'Expense'], { message: 'Choose Income or Expense' }),
  paymentMethod: z.string().trim().min(1, 'Choose a payment method'),
  amount: z
    .number({ message: 'Enter an amount' })
    .refine((v) => Number.isFinite(v), 'Enter a valid amount')
    .positive('Amount must be greater than zero')
    .max(1_000_000_000, 'Amount is unrealistically large'),
  notes: z.string().trim().max(500, 'Keep notes under 500 characters').default(''),
})

export type TransactionFormValues = z.input<typeof transactionSchema>
export type TransactionFormOutput = z.output<typeof transactionSchema>

export const goalSchema = z.object({
  name: z.string().trim().min(1, 'Goal name is required').max(80),
  targetAmount: z.number({ message: 'Enter a target amount' }).positive('Target must be greater than zero'),
  savedAmount: z.number({ message: 'Enter the saved amount' }).min(0, 'Saved amount cannot be negative'),
  targetDate: z.string().refine((v) => v === '' || isValidIsoDate(v), 'Enter a valid date'),
  notes: z.string().trim().max(300).default(''),
})

export type GoalFormValues = z.input<typeof goalSchema>
export type GoalFormOutput = z.output<typeof goalSchema>

export const DEFAULT_PAYMENT_METHODS = ['UPI', 'Card', 'Cash', 'Bank Transfer', 'Net Banking', 'Wallet', 'Other']
