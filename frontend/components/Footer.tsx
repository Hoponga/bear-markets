import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-bg-card border-t border-border-primary mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-text-muted text-sm">
            <span className="font-medium text-text-secondary">Berkeley Markets</span>
            <span>·</span>
            <Link href="/about" className="hover:text-text-primary transition">
              About
            </Link>
          </div>
          <div className="flex items-center space-x-6 text-sm">
            <Link
              href="/suggest"
              className="text-text-muted hover:text-text-primary font-medium transition"
            >
              Suggest more markets
            </Link>
            <Link
              href="/admin"
              className="text-text-muted hover:text-text-primary font-medium transition"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
