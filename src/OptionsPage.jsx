import React, { useState, useEffect } from "react";
import axios from "axios";

import {
  Search,
  Clock,
  ArrowRight,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const OptionsPage = () => {
  // State for the input field (separate from selectedStock)
  const [tickerInput, setTickerInput] = useState("MSFT");

  const [selectedStock, setSelectedStock] = useState({
    ticker: "MSFT",
    currentPrice: 438.17,
    atmStrike: 437.5,
    expiry: "2025-05-09",
  });

  const [priceRanges, setPriceRanges] = useState([]);
  const [strategiesData, setStrategiesData] = useState([]); // For API data
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch data from API
  const fetchOptionsData = async (ticker) => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `https://options-strategies.onrender.com/options-strategy-pnl?ticker=${ticker}`
      );
      const data = res.data;
      setSelectedStock({
        ticker: data.ticker,
        currentPrice: data.current_price,
        atmStrike: data.atm_strike_used,
        expiry: data.expiry,
      });
      setStrategiesData(data.strategies);
    } catch (err) {
      setError("Could not fetch data for ticker: " + ticker);
    } finally {
      setLoading(false);
    }
  };

  // On Enter key in input, fetch data
  const handleTickerInputKeyDown = (e) => {
    if (e.key === "Enter") {
      fetchOptionsData(tickerInput.trim().toUpperCase());
    }
  };

  // On mount, fetch initial data for MSFT
  useEffect(() => {
    fetchOptionsData("MSFT");
    // eslint-disable-next-line
  }, []);

  // If strategiesData is present, use it for table, else fallback to old logic
  useEffect(() => {
    if (strategiesData.length > 0) {
      // API data present: set priceRanges from API
      setPriceRanges(
        strategiesData.map((row) => ({
          price: Number(row["Price at Expiry"].replace("$", "")),
        }))
      );
    } else {
      // Fallback: old logic for price ranges
      const currentPrice = selectedStock.currentPrice;
      const atmStrike = selectedStock.atmStrike;
      const priceStep = currentPrice * 0.02; // ~2% steps
      const pricePoints = [];
      let includesStrike = false;
      for (let i = -5; i <= 5; i++) {
        const price = Number((currentPrice + i * priceStep).toFixed(2));
        if (Math.abs(price - atmStrike) < priceStep / 2) {
          pricePoints.push({ price: atmStrike });
          includesStrike = true;
        } else {
          pricePoints.push({ price: price });
        }
      }
      if (!includesStrike) {
        pricePoints.push({ price: atmStrike });
        pricePoints.sort((a, b) => a.price - b.price);
        if (pricePoints.length > 11) {
          if (atmStrike < currentPrice) {
            pricePoints.pop();
          } else {
            pricePoints.shift();
          }
        }
      }
      setPriceRanges(pricePoints);
    }
  }, [selectedStock, strategiesData]);

  // Strategies for table header
  const strategies = [
    { id: "LongCall", name: "Long Call" },
    { id: "LongPut", name: "Long Put" },
    { id: "CoveredCall", name: "Covered Call" },
    { id: "ProtectivePut", name: "Protective Put" },
    { id: "Straddle", name: "Straddle" },
    { id: "Strangle", name: "Strangle" },
    { id: "BullCallSpread", name: "Bull Call Spread" },
    { id: "BearPutSpread", name: "Bear Put Spread" },
    { id: "IronCondor", name: "Iron Condor" },
    { id: "ButterflySpread", name: "Butterfly Spread" },
  ];

  // Get value for cell
  const getStrategyValue = (strategyId, price, index) => {
    if (strategiesData.length > 0) {
      // Use API data
      const row = strategiesData[index];
      if (!row) return 0;
      const val = row[strategyId];
      if (!val) return 0;
      return val;
    }
    // Fallback: old logic (should not be used if API data is present)
    return 0;
  };

  const formatValue = (value) => {
    if (typeof value === "number") {
      if (value === 0) return "$0";
      return value > 0 ? `+$${Math.abs(value)}` : `-$${Math.abs(value)}`;
    }
    // If value is already formatted (from API)
    return value;
  };

  const isStrikePrice = (price) => {
    return Math.abs(price - selectedStock.atmStrike) < 0.01;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Options Strategies
            </h1>
            <div className="relative w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search ticker..."
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value)}
                onKeyDown={handleTickerInputKeyDown}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Stock Info */}
      <div className="bg-white shadow mt-4 mx-4 rounded-lg">
        <div className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">
                {selectedStock.ticker} — Current Price: ${selectedStock.currentPrice}
              </h2>
              <div className="flex items-center text-gray-600 mt-1">
                <span>ATM Strike: {selectedStock.atmStrike}</span>
                <span className="mx-2">|</span>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Expiry: {selectedStock.expiry}</span>
                </div>
              </div>
            </div>
            <button
              className="flex items-center text-blue-600 hover:text-blue-800"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            >
              <Settings className="h-5 w-5 mr-1" />
              <span>Settings</span>
              {isSettingsOpen ? (
                <ChevronUp className="h-4 w-4 ml-1" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-1" />
              )}
            </button>
          </div>
          {isSettingsOpen && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Current Price
                  </label>
                  <input
                    type="number"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={selectedStock.currentPrice}
                    onChange={(e) =>
                      setSelectedStock({
                        ...selectedStock,
                        currentPrice: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ATM Strike
                  </label>
                  <input
                    type="number"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={selectedStock.atmStrike}
                    onChange={(e) =>
                      setSelectedStock({
                        ...selectedStock,
                        atmStrike: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={selectedStock.expiry}
                    onChange={(e) =>
                      setSelectedStock({
                        ...selectedStock,
                        expiry: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Options Table */}
      <div className="flex-1 mx-4 mt-4 mb-4 bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10"
                  >
                    Price at Expiry
                  </th>
                  {strategies.map((strategy) => (
                    <th
                      key={strategy.id}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {strategy.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {priceRanges.map((pricePoint, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium sticky left-0 z-10 ${
                        isStrikePrice(pricePoint.price)
                          ? "bg-blue-100 text-blue-800 font-bold"
                          : "text-gray-900"
                      }`}
                      style={{
                        backgroundColor: isStrikePrice(pricePoint.price)
                          ? "#dbeafe"
                          : index % 2 === 0
                          ? "white"
                          : "#f9fafb",
                      }}
                    >
                      ${pricePoint.price} {isStrikePrice(pricePoint.price) && "(Strike)"}
                    </td>
                    {strategies.map((strategy) => {
                      const value = getStrategyValue(
                        strategy.id,
                        pricePoint.price,
                        index
                      );
                      return (
                        <td
                          key={`${index}-${strategy.id}`}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          <span
                            className={
                              typeof value === "string" && value.startsWith("+")
                                ? "text-green-600"
                                : typeof value === "string" && value.startsWith("-")
                                ? "text-red-600"
                                : ""
                            }
                          >
                            {formatValue(value)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptionsPage;
