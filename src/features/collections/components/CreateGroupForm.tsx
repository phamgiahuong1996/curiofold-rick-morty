import { useState } from 'react';
import type { FormEvent, RefObject } from 'react';

import { useCollectionsStore } from '../store/collectionsStore';

interface CreateGroupFormProps {
  inputRef: RefObject<HTMLInputElement | null>;
  onCreated: (name: string) => void;
}

export function CreateGroupForm({ inputRef, onCreated }: CreateGroupFormProps) {
  const createGroup = useCollectionsStore((state) => state.createGroup);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createGroup(name)) {
      setNameError(true);
      inputRef.current?.focus();
      return;
    }
    onCreated(name.trim());
    setName('');
    setNameError(false);
    inputRef.current?.focus();
  }

  return (
    <form className="group-create" onSubmit={submit} noValidate>
      <label htmlFor="group-name">Group name</label>
      <div className="group-create__controls">
        <input
          id="group-name"
          ref={inputRef}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setNameError(false);
          }}
          aria-invalid={nameError}
          aria-describedby={nameError ? 'group-name-error' : undefined}
        />
        <button type="submit">Create group</button>
      </div>
      {nameError && (
        <p id="group-name-error" role="alert">
          Enter a group name with at least one visible character.
        </p>
      )}
    </form>
  );
}
