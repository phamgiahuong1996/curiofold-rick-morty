import { useState } from 'react';
import type { ReactNode } from 'react';

import type { Character } from '../types/character';

interface CharacterCardProps {
  character: Character;
  actions?: ReactNode;
}

export function CharacterCard({ character, actions }: CharacterCardProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const imageUnavailable = !character.image || failedSource === character.image;

  return (
    <article className="character-card" aria-labelledby={`character-${character.id}`}>
      <div className="character-card__portrait">
        {imageUnavailable ? (
          <div
            className="character-card__fallback"
            role="img"
            aria-label={`Portrait unavailable for ${character.name}`}
          >
            <span aria-hidden="true">{character.name.slice(0, 1)}</span>
            <span aria-hidden="true">Image unavailable</span>
          </div>
        ) : (
          <img
            src={character.image}
            alt={`${character.name} portrait`}
            width="300"
            height="300"
            loading="lazy"
            onError={() => setFailedSource(character.image)}
          />
        )}
      </div>
      <div className="character-card__body">
        <p className="character-card__identity">
          {character.status === 'unknown' ? 'Status unknown' : character.status} ·{' '}
          {character.species}
        </p>
        <h3 id={`character-${character.id}`}>{character.name}</h3>
        <dl>
          <dt>Last known location</dt>
          <dd>{character.location.name}</dd>
        </dl>
        {actions && <div className="character-card__actions">{actions}</div>}
      </div>
    </article>
  );
}
