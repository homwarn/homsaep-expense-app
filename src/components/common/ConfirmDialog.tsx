import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/I18nProvider'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  onConfirm: () => void
  title?: string
  description?: string
  loading?: boolean
}

export function ConfirmDialog({ open, onOpenChange, onConfirm, title, description, loading }: Props) {
  const { t } = useI18n()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? t('confirm_delete')}</DialogTitle>
          <DialogDescription>{description ?? t('confirm_delete_msg')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {t('delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
