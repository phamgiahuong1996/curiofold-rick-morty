export type CharacterStatus = 'Alive' | 'Dead' | 'unknown';
export type CharacterGender = 'Female' | 'Male' | 'Genderless' | 'unknown';

export interface Character {
  id: number;
  name: string;
  status: CharacterStatus;
  species: string;
  type: string;
  gender: CharacterGender;
  origin: { name: string };
  location: { name: string };
  image: string;
}

export interface CharacterPage {
  info: { count: number; pages: number };
  results: Character[];
}

export interface CharacterSearchParams {
  name: string;
  page: number;
}
