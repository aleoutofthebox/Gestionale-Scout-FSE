import React from 'react';

export function FirmeStampa() {
  return (
    <div className="mt-12 grid grid-cols-2 gap-12 text-center text-sm">
      <div>
        <div className="mb-10 text-stone-600">Il Tesoriere</div>
        <div className="border-t border-stone-400 pt-1 text-xs text-stone-400">firma</div>
      </div>
      <div>
        <div className="mb-10 text-stone-600">Il Capo Gruppo</div>
        <div className="border-t border-stone-400 pt-1 text-xs text-stone-400">firma</div>
      </div>
    </div>
  );
}
