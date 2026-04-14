export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold text-text-primary mb-2">About Berkeley Markets</h1>
          <p className="text-lg text-text-muted">
            What this project is and how to think about it.
          </p>
        </div>

        <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-8 space-y-6 text-text-secondary text-lg leading-relaxed">
          <p>
            Bear Markets is a prediction market for the number one public university in the world. This is just a side project we thought would be fun to build.
          </p>

          <div className="bg-bg-hover border border-border-secondary rounded-lg p-6">
            <p className="font-medium text-text-primary mb-2">No real money</p>
            <p className="text-text-secondary">
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
