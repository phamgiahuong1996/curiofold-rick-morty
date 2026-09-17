import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="page-intro" aria-labelledby="not-found-heading">
      <p className="page-kicker">Uncharted territory</p>
      <h1 id="not-found-heading">Page not found</h1>
      <p className="page-description">
        There is nothing at this address. Head back to Explore to find your way.
      </p>
      <Link className="page-return" to="/">
        Back to Explore
      </Link>
    </section>
  );
}
