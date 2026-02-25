'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function AccountSelector() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    // Simulando fetch de contas
    setAccounts([
      { id: '123-456-7890', name: 'Minha Conta Principal' },
      { id: '098-765-4321', name: 'Cliente X - E-commerce' },
    ]);
  }, []);

  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[250px] justify-between border-white/10 bg-white/5 text-white hover:bg-white/10"
          onClick={() => setOpen(!open)}
        >
          {value
            ? accounts.find((account) => account.id === value)?.name
            : 'Selecionar conta...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        {open && (
          <div className="absolute top-full left-0 mt-2 w-[250px] rounded-md border border-white/10 bg-[#09090b] shadow-xl z-[100]">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center px-3 py-2 cursor-pointer hover:bg-white/5 text-sm text-zinc-300 hover:text-white"
                onClick={() => {
                  setValue(account.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === account.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {account.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
