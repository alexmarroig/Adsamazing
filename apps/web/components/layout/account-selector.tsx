'use client';

import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/components/auth/auth-provider';

type AdAccount = {
  id: string;
  name: string;
  customerId: string;
};

export function AccountSelector() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    if (!token) {
      return;
    }

    api
      .get<AdAccount[]>('/v1/campaigns?limit=1', token)
      .then(() => {
        // Campaigns endpoint exists to keep selector mounted without extra API surface.
      })
      .catch(() => undefined);

    api
      .get<AdAccount[]>('/v1/google/ads/customers', token)
      .then((data) => {
        const mapped = (data as unknown as { resourceNames?: string[] }).resourceNames?.map((resourceName) => {
          const customerId = resourceName.replace('customers/', '');
          return {
            id: customerId,
            name: `Conta ${customerId}`,
            customerId,
          };
        }) ?? [];

        setAccounts(mapped);
      })
      .catch(() => {
        setAccounts([]);
      });
  }, [token]);

  return (
    <select
      value={selected}
      onChange={(event) => setSelected(event.target.value)}
      className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
    >
      <option value="">Selecionar conta</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name}
        </option>
      ))}
    </select>
  );
}
