'use client';

import { useId, useState } from 'react';
import { Switch } from '@headlessui/react';

type Props = {
  name: string;
  defaultChecked?: boolean;
  label: string;
};

/** Toggle switch that submits `on` / `off` via a hidden input for server actions. */
export default function FormSwitch({ name, defaultChecked = false, label }: Props) {
  const [checked, setChecked] = useState(defaultChecked);
  const labelId = useId();

  return (
    <div className="flex items-center gap-3 text-sm">
      <Switch
        checked={checked}
        onChange={setChecked}
        aria-labelledby={labelId}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </Switch>
      <span id={labelId} className="font-medium text-secondary-foreground">
        {label}
      </span>
      <input type="hidden" name={name} value={checked ? 'on' : 'off'} />
    </div>
  );
}
