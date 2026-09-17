import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

interface CharacterSearchProps {
  name: string;
  navigationKey: string;
  onCommit: (name: string) => void;
}

export function CharacterSearch({ name, navigationKey, onCommit }: CharacterSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState({ input: name, navigationKey });

  // URL navigation wins over an uncommitted draft without remounting the input.
  if (draft.navigationKey !== navigationKey) {
    setDraft({ input: name, navigationKey });
  }

  useEffect(() => {
    if (draft.navigationKey !== navigationKey || draft.input.trim() === name) return;
    const timer = window.setTimeout(() => onCommit(draft.input.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [draft, name, navigationKey, onCommit]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCommit(draft.input.trim());
  }

  return (
    <form
      className="character-search"
      role="search"
      aria-label="Character discovery"
      onSubmit={submit}
    >
      <label htmlFor="character-search">Search characters by name</label>
      <div className="character-search__controls">
        <input
          ref={inputRef}
          id="character-search"
          type="search"
          value={draft.input}
          onChange={(event) => setDraft({ input: event.target.value, navigationKey })}
          placeholder="Try Rick, Morty, or someone unexpected"
          autoComplete="off"
        />
        {draft.input && (
          <button
            type="button"
            onClick={() => {
              setDraft({ input: '', navigationKey });
              onCommit('');
              inputRef.current?.focus();
            }}
          >
            Clear search
          </button>
        )}
      </div>
    </form>
  );
}
