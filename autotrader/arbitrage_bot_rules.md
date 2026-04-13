Your task is to make an arbitrage bot to keep the market efficient. To start, on discovering a new market, it should buy 50 of YES and NO each. It should execute this in a loop for every market every 10 seconds:

1. Check if there is minting arbitrage (best ask yes + best ask no < 0.99). If so, buy both (if possible).
2. Check if there is reemption arbitrage (best bid yes + best bid no > 1.01). If so, sell both (if possible).

Keep track of how much money the bot has won/lost from each market.