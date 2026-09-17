interface CharacterPaginationProps {
  page: number;
  pages: number;
  updating: boolean;
  onPageChange: (page: number) => void;
}

export function CharacterPagination({
  page,
  pages,
  updating,
  onPageChange,
}: CharacterPaginationProps) {
  return (
    <nav className="character-pagination" aria-label="Character results pagination">
      <button type="button" disabled={page <= 1 || updating} onClick={() => onPageChange(page - 1)}>
        Previous page
      </button>
      <p>
        Page <strong>{page}</strong> of <strong>{pages}</strong>
      </p>
      <button
        type="button"
        disabled={page >= pages || updating}
        onClick={() => onPageChange(page + 1)}
      >
        Next page
      </button>
    </nav>
  );
}
