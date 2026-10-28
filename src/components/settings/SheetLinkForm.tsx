import { useState } from 'react'
import { Button, Stack, TextField, type SxProps, type Theme } from '@mui/material'
import AddLinkOutlinedIcon from '@mui/icons-material/AddLinkOutlined'
import { useExcelConnection } from '@/hooks/useExcelConnection'

interface SheetLinkFormProps {
  /** Light text and borders for use on the dark welcome banner. */
  onDark?: boolean
}

/** Paste a Google Sheets "Publish to web" link (or any public .xlsx link) to read the workbook from it. */
export function SheetLinkForm({ onDark = false }: SheetLinkFormProps) {
  const c = useExcelConnection()
  const [url, setUrl] = useState(c.mode === 'link' ? (c.sourceUrl ?? '') : '')
  const darkField: SxProps<Theme> = onDark
    ? {
        '& .MuiInputBase-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
        '& .MuiInputLabel-root, & .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.8)' },
      }
    : {}

  return (
    <Stack
      component="form"
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ alignItems: { sm: 'flex-start' } }}
      onSubmit={(e) => {
        e.preventDefault()
        if (url.trim()) void c.connectLink(url)
      }}
    >
      <TextField
        size="small"
        fullWidth
        label="Google Sheet link"
        placeholder="https://docs.google.com/spreadsheets/d/e/…/pubhtml"
        helperText='In Google Sheets: File → Share → Publish to web → Entire document → Publish, then paste the link.'
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        sx={darkField}
      />
      <Button
        type="submit"
        variant={onDark ? 'outlined' : 'contained'}
        color={onDark ? 'inherit' : 'primary'}
        startIcon={<AddLinkOutlinedIcon />}
        disabled={!url.trim() || c.loading}
        sx={{ flexShrink: 0, minHeight: 40, ...(onDark ? { borderColor: 'rgba(255,255,255,0.5)' } : {}) }}
      >
        Connect link
      </Button>
    </Stack>
  )
}
