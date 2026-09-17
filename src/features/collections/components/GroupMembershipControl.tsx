import { useId, useState } from 'react';

import { useCollectionsStore } from '../store/collectionsStore';

interface GroupMembershipControlProps {
  characterId: number;
  characterName: string;
}

export function GroupMembershipControl({
  characterId,
  characterName,
}: GroupMembershipControlProps) {
  const groups = useCollectionsStore((state) => state.groups);
  const isFavourite = useCollectionsStore((state) => state.favouriteIds.includes(characterId));
  const addCharacterToGroup = useCollectionsStore((state) => state.addCharacterToGroup);
  const removeCharacterFromGroup = useCollectionsStore((state) => state.removeCharacterFromGroup);
  const [expanded, setExpanded] = useState(false);
  const controlId = useId();

  if (!isFavourite || groups.length === 0) return null;
  const membershipCount = groups.filter((group) => group.characterIds.includes(characterId)).length;

  return (
    <div className="group-membership-control">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={expanded ? controlId : undefined}
        aria-label={`Manage groups for ${characterName}`}
        onClick={() => setExpanded(!expanded)}
      >
        Groups ({membershipCount})
      </button>
      {expanded && (
        <fieldset className="group-membership" id={controlId}>
          <legend>Groups for {characterName}</legend>
          {groups.map((group) => (
            <label key={group.id}>
              <input
                type="checkbox"
                checked={group.characterIds.includes(characterId)}
                onChange={(event) =>
                  event.target.checked
                    ? addCharacterToGroup(group.id, characterId)
                    : removeCharacterFromGroup(group.id, characterId)
                }
              />
              <span>{group.name}</span>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
