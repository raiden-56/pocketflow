import { useState } from 'react'
import { Button, Stack, TextField, type SxProps, type Theme } from '@mui/material'
import AddLinkOutlinedIcon from '@mui/icons-material/AddLinkOutlined'
import { useExcelConnection } from '@/hooks/useExcelConnection'
import { isScriptUrl } from '@/services/excel/sheetScript'

interface SheetLinkFormProps {
  /** Light text and borders for use on the dark welcome banner. */
  onDark?: boolean
}

/**
 * Connect a Google Sheet: the PocketFlow Apps Script address plus its secret key (private sheet, read and save),
 * or a "Publish to web" / public .xlsx link (read-only).
 */
export function SheetLinkForm({ onDark = false }: SheetLinkFormProps) {
  const c = useExcelConnection()
  const [url, setUrl] = useState(c.mode === 'link' ? (c.sourceUrl ?? '') : '')
  const [key, setKey] = useState('')
  const darkField: SxProps<Theme> = onDark
    ? {
        '& .MuiInputBase-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
        '& .MuiInputLabel-root, & .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.8)' },
      }
    : {}

  // A PocketFlow Apps Script URL (private sheet) also needs its secret key; a published link does not.
  const privateSheet = isScriptUrl(url)
  const ready = url.trim() !== '' && (!privateSheet || key.trim() !== '')

  return (
    <Stack
      component="form"
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ alignItems: { sm: 'flex-start' } }}
      onSubmit={(e) => {
        e.preventDefault()
        if (ready) void c.connectLink(url, privateSheet ? key : undefined)
      }}
    >
      <TextField
        size="small"
        fullWidth
        label="Google Sheet link"
        placeholder="https://script.google.com/macros/s/…/exec"
        helperText={
          privateSheet
            ? 'Your PocketFlow Apps Script web app address (Deploy → Manage deployments).'
            : 'Private sheet: the Apps Script /exec address. Published sheet: File → Share → Publish to web link.'
        }
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        sx={darkField}
      />
      {privateSheet && (
        <TextField
          size="small"
          fullWidth
          type="password"
          label="Secret key"
          autoComplete="off"
          helperText="The KEY from your Apps Script. Saved only in this browser."
          value={key}
          onChange={(e) => setKey(e.target.value)}
          sx={darkField}
        />
      )}
      <Button
        type="submit"
        variant={onDark ? 'outlined' : 'contained'}
        color={onDark ? 'inherit' : 'primary'}
        startIcon={<AddLinkOutlinedIcon />}
        disabled={!ready || c.loading}
        sx={{ flexShrink: 0, minHeight: 40, ...(onDark ? { borderColor: 'rgba(255,255,255,0.5)' } : {}) }}
      >
        Connect link
      </Button>
    </Stack>
  )
}
