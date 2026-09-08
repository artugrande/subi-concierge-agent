"use client";

import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"claim" | "pledge">("claim");

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          SUBI Concierge
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Space Universal Basic Income
        </p>
        <p className="text-sm text-gray-500">
          Article I of the Outer Space Treaty: &ldquo;exploration shall be carried out for the benefit and in the interests of all countries&rdquo;
        </p>
      </header>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setActiveTab("claim")}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === "claim"
                ? "bg-[var(--celo-green)] text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Claim Dividend
          </button>
          <button
            onClick={() => setActiveTab("pledge")}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === "pledge"
                ? "bg-[var(--celo-green)] text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Pledge Contribution
          </button>
        </div>
      </div>

      {/* Claim Tab */}
      {activeTab === "claim" && (
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Claim Your Universal Basic Income
          </h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Self-Verified Identity Required</strong>
              <br />
              Scan your passport with Self to verify you&apos;re a unique human. Zero personal data transmitted.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Claimable Balance</span>
              <span className="text-2xl font-bold text-[var(--celo-green)]">
                $0.00 USD
              </span>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Daily Rate</span>
              <span className="text-lg font-semibold text-gray-900">
                TBD
              </span>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Proof of Life Expiration</span>
              <span className="text-lg font-semibold text-gray-900">
                Not registered
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <button className="btn-primary w-full">
              Register with Self
            </button>
            <button className="btn-secondary w-full" disabled>
              Claim Dividend
            </button>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            <p>
              <strong>Fee Abstraction (CIP-64):</strong> Gas paid in the stablecoin you claim. No CELO token needed.
            </p>
            <p className="mt-2">
              <strong>Distribution Model:</strong> Perpetual fund with 4% annual draw rate (Alaska POMV-style).
              Amount = (treasury × 4%) ÷ 365 ÷ verified_humans
            </p>
          </div>
        </div>
      )}

      {/* Pledge Tab */}
      {activeTab === "pledge" && (
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Space Dividend Pledge
          </h2>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Voluntary Commitment</strong>
              <br />
              Organizations with space-derived revenue can pledge a percentage to the SUBI treasury. 
              Not legally binding - transparency via immutable on-chain record.
            </p>
          </div>

          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Name
              </label>
              <input
                type="text"
                placeholder="e.g., SpaceX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--celo-green)] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Percentage of Space Revenue
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="5"
                  min="0"
                  max="100"
                  step="0.1"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--celo-green)] focus:border-transparent"
                />
                <span className="text-gray-600">%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Annual Floor (USD)
              </label>
              <input
                type="number"
                placeholder="100000"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--celo-green)] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum guaranteed annual contribution
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commitment Type
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--celo-green)] focus:border-transparent">
                <option value="perpetual">Perpetual</option>
                <option value="1year">1 Year</option>
                <option value="3years">3 Years</option>
                <option value="5years">5 Years</option>
              </select>
            </div>

            <button type="submit" className="btn-primary w-full">
              Create Pledge
            </button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              What happens next?
            </h3>
            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
              <li>Pledge is recorded on-chain with immutable timestamp</li>
              <li>Submit quarterly audited reports with contribution amounts</li>
              <li>Public dashboard shows who committed and who delivered</li>
              <li>No legal enforcement - transparency is the mechanism</li>
            </ol>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-6 mt-12">
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            Why Celo?
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>✓ ~$0.0005 per transaction (vs pennies on other chains)</li>
            <li>✓ Pay gas in stablecoins (CIP-64 fee abstraction)</li>
            <li>✓ 21 stablecoins: 15 local currencies + USDC/USDT</li>
            <li>✓ MiniPay: 11M+ wallets in 60+ countries</li>
            <li>✓ Self identity is Celo-native</li>
          </ul>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            Anti-Farming Design
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>✓ One human, one slot (Self nullifiers)</li>
            <li>✓ Non-transferable registry entries</li>
            <li>✓ 12-month proof-of-life renewal</li>
            <li>✓ Conservative accounting (pays less when stale, never more)</li>
            <li>✓ No token to speculate on</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>
          Built for <strong>Celo Agents at Work Hackathon</strong> | Track: Judges&apos; Favorite
        </p>
        <p className="mt-2">
          Created by <a href="https://subi.space" target="_blank" rel="noopener noreferrer" className="text-[var(--celo-green)] hover:underline">Arturo Grande</a> | Telegram: @artugrande
        </p>
        <p className="mt-2 text-xs">
          Reference: <a href="https://subi.space" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">subi.space</a>
        </p>
      </footer>
    </main>
  );
}
