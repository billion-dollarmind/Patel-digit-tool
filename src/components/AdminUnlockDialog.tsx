import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { unlockAdmin } from '@/lib/adminGate';

interface AdminUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdminUnlockDialog = ({ open, onOpenChange }: AdminUnlockDialogProps) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const close = (next: boolean) => {
    if (!next) {
      setPassword('');
      setError('');
    }
    onOpenChange(next);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!unlockAdmin(password)) {
      setError('Incorrect password.');
      setPassword('');
      return;
    }
    setPassword('');
    setError('');
    onOpenChange(false);
    navigate('/admin');
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Admin access</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input
            type="password"
            autoFocus
            autoComplete="off"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={!password}>
            Enter
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
