import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-gray-500 text-sm">
            <span className="font-medium text-gray-700">Berkeley Markets</span>
            <span>·</span>
            <Link href="/about" className="hover:text-blue-600 transition">
              About
            </Link>
          </div>
          <div className="flex items-center space-x-6 text-sm">
            <Link
              href="/suggest"
              className="text-gray-600 hover:text-blue-600 font-medium transition"
            >
              Suggest more markets
            </Link>
            <Link
              href="/admin"
              className="text-gray-600 hover:text-blue-600 font-medium transition"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
