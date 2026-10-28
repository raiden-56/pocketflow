import { useEffect } from 'react'
import { Alert, Box } from '@mui/material'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { dismissToast, type Toast } from '@/features/ui/uiSlice'

export function ToastHost() {
  const toasts = useAppSelector((s) => s.ui.toasts)
  const dispatch = useAppDispatch()
  return (
    <Box
      aria-live="polite"
      sx={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: { xs: 80, md: 24 },
        zIndex: (t) => t.zIndex.snackbar,
        width: { xs: 'calc(100vw - 32px)', sm: 440 },
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => dispatch(dismissToast(t.id))} />
        ))}
      </AnimatePresence>
    </Box>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, toast.severity === 'error' ? 8000 : toast.severity === 'warning' ? 6000 : 4000)
    return () => window.clearTimeout(timer)
  }, [onClose, toast.severity])
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      style={{ pointerEvents: 'auto' }}
    >
      <Alert onClose={onClose} severity={toast.severity} variant="filled" sx={{ width: '100%', boxShadow: 4, alignItems: 'center' }}>
        {toast.message}
      </Alert>
    </motion.div>
  )
}
