import React, { useState, useEffect } from "react";
import axios from "axios";
import "./OptionsPage.css";
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
  const [tickerInput, setTickerInput] = useState("");

  const [selectedStock, setSelectedStock] = useState({
    ticker: "",
    currentPrice: 438.17,
    atmStrike: 437.5,
    expiry: "2025-05-09",
  });

  const [priceRanges, setPriceRanges] = useState([]);
  const [strategiesData, setStrategiesData] = useState([]); // For API data
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch data from API
  const fetchOptionsData = async (ticker) => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `http://127.0.0.1:8000/options-strategy-pnl?ticker=${ticker}`
      );
      const data = res.data;
      setSelectedStock({
        ticker: data.ticker,
        currentPrice: data.current_price,
        atmStrike: data.atm_strike_used,
        expiry: data.expiry,
      });
      setStrategiesData(data.strategies);
      setHasSearched(true);
    } catch (err) {
      setError("Could not fetch data for ticker: " + ticker);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  // On Enter key in input, fetch data
  const handleTickerInputKeyDown = (e) => {
    if (e.key === "Enter") {
      setHasSearched(true);
      fetchOptionsData(tickerInput.trim().toUpperCase());
    }
  };


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

  // Helper: is ticker input empty
  const isTickerEmpty = tickerInput.trim() === "";

  // Fallback stock info for empty ticker
  const fallbackStock = {
    ticker: "Ticker",
    currentPrice: 0,
    atmStrike: 0,
    expiry: "Not available",
  };

  // Fallback table rows for empty ticker
  const fallbackTableRows = Array.from({ length: 9 }).map((_, rowIdx) => ({
    price: 0,
  }));

  // Only show error if not empty ticker and user has searched
  const showError = error && !isTickerEmpty && hasSearched;

  // Error message for summary card
  const summaryErrorMsg = showError ? "Please check the ticker symbol." : null;

  // Always use the current input for summary fallback
  const liveSummary = {
    ticker: tickerInput.trim() === "" ? fallbackStock.ticker : tickerInput.trim().toUpperCase(),
    currentPrice: 0,
    atmStrike: 0,
    expiry: fallbackStock.expiry,
  };

  // Determine if API data matches the current input
  const apiTicker = selectedStock.ticker ? selectedStock.ticker.toUpperCase() : "";
  const inputTicker = tickerInput.trim().toUpperCase();
  const hasApiDataForInput =
    strategiesData.length > 0 &&
    !showError &&
    inputTicker !== "" &&
    apiTicker === inputTicker;

  // Show summary data: loading -> shimmer, error -> error, else -> API or fallback
  let summaryToShow = liveSummary;
  if (loading) {
    summaryToShow = null; // shimmer will show
  } else if (showError) {
    summaryToShow = { ...liveSummary, error: summaryErrorMsg };
  } else if (hasApiDataForInput) {
    summaryToShow = {
      ticker: selectedStock.ticker,
      currentPrice: selectedStock.currentPrice,
      atmStrike: selectedStock.atmStrike,
      expiry: selectedStock.expiry,
    };
  }

  // Table rows: loading -> shimmer, error/empty -> $0, else -> API data
  let tableRowsToShow = fallbackTableRows;
  if (loading) {
    tableRowsToShow = null; // shimmer will show
  } else if (hasApiDataForInput) {
    tableRowsToShow = priceRanges;
  }

  return (
    <div className="options-root">
      {/* Header */}
      <div className="options-header">
        <div className="options-header-inner">
          <h1 className="options-title">Options Strategies</h1>
          <div className="options-search-wrap">
            <span className="options-search-icon">
              <Search />
            </span>
            <input
              type="text"
              className="options-search-input"
              placeholder="Search ticker..."
              value={tickerInput}
              onChange={(e) => {
                setTickerInput(e.target.value);
                setError("");
                setHasSearched(false);
                setStrategiesData([]);
                setSelectedStock(fallbackStock);
              }}
              onKeyDown={handleTickerInputKeyDown}
              disabled={loading}
            />
          </div>
        </div>
      </div>
      {/* Stock Info Card */}
      <div className="options-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            {loading ? (
              <>
                <div className="skeleton-block medium shimmer" style={{ marginBottom: 10 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="skeleton-block short shimmer" />
                  <div className="skeleton-block short shimmer" />
                  <div className="skeleton-block medium shimmer" />
                </div>
              </>
            ) : summaryToShow && summaryToShow.error ? (
              <div style={{ minHeight: 48, display: 'flex', alignItems: 'center', color: '#dc2626', fontWeight: 500, fontSize: '1.1rem' }}>{summaryToShow.error}</div>
            ) : (
              <>
                <div className="options-stock-title">
                  {summaryToShow.ticker} — Current Price: ${summaryToShow.currentPrice}
                </div>
                <div className="options-stock-meta">
                  <span>ATM Strike: {summaryToShow.atmStrike}</span>
                  <span>|</span>
                  <span style={{ display: "flex", alignItems: "center" }}>
                    <Clock style={{ width: 16, height: 16, marginRight: 4 }} />
                    Expiry: {summaryToShow.expiry}
                  </span>
                </div>
              </>
            )}
          </div>
          <button
            className="options-settings-btn"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            disabled={loading}
          >
            <Settings style={{ width: 20, height: 20, marginRight: 6 }} />
            <span>Settings</span>
            {isSettingsOpen ? (
              <ChevronUp style={{ width: 16, height: 16, marginLeft: 4 }} />
            ) : (
              <ChevronDown style={{ width: 16, height: 16, marginLeft: 4 }} />
            )}
          </button>
        </div>
        {isSettingsOpen && (
          <div className="options-settings-panel">
            <div className="options-settings-grid">
              <div>
                <label className="options-settings-label">Current Price</label>
                <input
                  type="number"
                  className="options-settings-input"
                  value={summaryToShow ? summaryToShow.currentPrice : 0}
                  onChange={(e) =>
                    setSelectedStock({
                      ...selectedStock,
                      currentPrice: parseFloat(e.target.value),
                    })
                  }
                  disabled={loading}
                />
              </div>
              <div>
                <label className="options-settings-label">ATM Strike</label>
                <input
                  type="number"
                  className="options-settings-input"
                  value={summaryToShow ? summaryToShow.atmStrike : 0}
                  onChange={(e) =>
                    setSelectedStock({
                      ...selectedStock,
                      atmStrike: parseFloat(e.target.value),
                    })
                  }
                  disabled={loading}
                />
              </div>
              <div>
                <label className="options-settings-label">Expiry Date</label>
                <input
                  type="date"
                  className="options-settings-input"
                  value={summaryToShow ? (summaryToShow.expiry === fallbackStock.expiry ? "" : summaryToShow.expiry) : ""}
                  onChange={(e) =>
                    setSelectedStock({
                      ...selectedStock,
                      expiry: e.target.value,
                    })
                  }
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Options Table */}
      <div className="options-table-wrap">
        <div className="options-table-scroll">
          <table className="options-table">
            <thead>
              <tr>
                <th>Price at Expiry</th>
                {strategies.map((strategy) => (
                  <th key={strategy.id}>{strategy.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 9 }).map((_, rowIdx) => (
                    <tr className="skeleton-table-row" key={rowIdx}>
                      <td>
                        <div className="skeleton-table-cell shimmer" style={{ width: 100 }} />
                      </td>
                      {strategies.map((_, colIdx) => (
                        <td key={colIdx}>
                          <div className="skeleton-table-cell shimmer" style={{ width: 70 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : hasApiDataForInput
                  ? priceRanges.map((pricePoint, index) => (
                      <tr key={index}>
                        <td
                          className={
                            isStrikePrice(pricePoint.price)
                              ? "options-strike"
                              : ""
                          }
                        >
                          ${pricePoint.price}
                          {isStrikePrice(pricePoint.price) && (
                            <span className="options-strike-label"> (Strike)</span>
                          )}
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
                              className={
                                typeof value === "string" && value.startsWith("+")
                                  ? "options-pos"
                                  : typeof value === "string" && value.startsWith("-")
                                  ? "options-neg"
                                  : ""
                              }
                            >
                              {formatValue(value)}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  : fallbackTableRows.map((_, rowIdx) => (
                      <tr key={rowIdx}>
                        <td>$0</td>
                        {strategies.map((strategy, colIdx) => (
                          <td key={colIdx}>$0</td>
                        ))}
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OptionsPage;
