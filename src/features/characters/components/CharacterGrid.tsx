import type { ReactNode } from 'react';

import type { Character } from '../types/character';
import { CharacterCard } from './CharacterCard';

interface CharacterGridProps {
  characters: Character[];
  renderActions?: (character: Character) => ReactNode;
}

export function CharacterGrid({ characters, renderActions }: CharacterGridProps) {
  return (
    <ul className="character-grid" aria-label="Characters">
      {characters.map((character) => (
        <li key={character.id}>
          <CharacterCard character={character} actions={renderActions?.(character)} />
        </li>
      ))}
    </ul>
  );
}

export function CharacterGridSkeleton() {
  return (
    <div className="character-grid" aria-hidden="true">
      {Array.from({ length: 20 }, (_, index) => (
        <div className="character-card character-skeleton" key={index}>
          <div className="character-card__portrait" />
          <div className="character-card__body">
            <span />
            <span />
            <span />
          </div>
        </div>
      ))}
    </div>
  );
}
