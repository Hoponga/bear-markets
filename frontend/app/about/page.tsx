export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">About Berkeley Markets</h1>
        <div className="space-y-6 text-gray-600 text-lg leading-relaxed">
          <p>
            Bear Markets is a prediction market for the number one public university in the world. This is just a side project we thought would be fun to build.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <p className="font-medium text-amber-900 mb-2">No real money</p>
            <p className="text-amber-800">
              Everything here is fake money (tokens). We&apos;re not gambling, we&apos;re not
              investing—just messing around and seeing how prediction markets work. Nothing
              you win or lose is worth actual cash.
            </p>
          </div>
          <p>
            We have a leaderboard to see who is the best predictor overall, and private markets to trade with your friends.
          </p>
        </div>
      </div>
    </div>
  );
}
