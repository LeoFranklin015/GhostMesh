'use client'

import { useEffect, useState } from 'react'

interface MessageData {
  entityKey: string
  data: {
    type: string
    content: string
    from: string
    timestamp: string
    uuid?: string
    source: string
  }
  encrypted: boolean
  encryptedData?: string
  decryptedData?: string
}

interface ApiResponse {
  success: boolean
  data?: MessageData[]
  count?: number
  filters?: {
    date: string | null
    from: string | null
    type: string | null
  }
  error?: string
}

export default function AllDatasPage() {
  const [messages, setMessages] = useState<MessageData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    date: '',
    from: '',
    type: '',
  })
  const [filteredCount, setFilteredCount] = useState(0)

  const fetchAllData = async (queryParams?: string) => {
    try {
      setLoading(true)
      setError(null)

      const url = queryParams
        ? `/api/alldatas?${queryParams}`
        : '/api/alldatas'

      const response = await fetch(url)
      const result: ApiResponse = await response.json()

      if (result.success && result.data) {
        setMessages(result.data)
        setFilteredCount(result.count || 0)
      } else {
        setError(result.error || 'Failed to fetch data')
        setMessages([])
      }
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err.message || 'Failed to fetch data')
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  const handleFilter = () => {
    const params = new URLSearchParams()
    if (filters.date) params.append('date', filters.date)
    if (filters.from) params.append('from', filters.from)
    if (filters.type) params.append('type', filters.type)

    fetchAllData(params.toString())
  }

  const clearFilters = () => {
    setFilters({ date: '', from: '', type: '' })
    fetchAllData()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-4 mb-6">
          <div className="flex gap-4">
            <a
              href="/"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm"
            >
              🏠 Server Dashboard
            </a>
            <a
              href="/alldatas"
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded text-white text-sm"
            >
              📊 View All Data (API)
            </a>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            📊 All Saved Data from Arkiv
          </h1>
          <p className="text-slate-400">
            View all decrypted messages stored in Arkiv (via API)
          </p>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">🔍 Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Date</label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">From</label>
              <input
                type="text"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                placeholder="Filter by sender"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Type</label>
              <input
                type="text"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                placeholder="Filter by type"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleFilter}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white"
            >
              Clear Filters
            </button>
            <button
              onClick={() => fetchAllData()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Status */}
        {loading && (
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 mb-6">
            <p className="text-blue-300">🔄 Loading data from Arkiv...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-6">
            <p className="text-red-300">❌ Error: {error}</p>
          </div>
        )}

        {/* Results Count */}
        {!loading && !error && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-4 mb-6">
            <p className="text-white">
              📋 Found <strong>{filteredCount}</strong> message(s)
            </p>
          </div>
        )}

        {/* Messages List */}
        {!loading && !error && messages.length > 0 && (
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={msg.entityKey || index}
                className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Message #{index + 1}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {new Date(msg.data?.timestamp || Date.now()).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      msg.encrypted
                        ? 'bg-blue-900/30 text-blue-400'
                        : 'bg-yellow-900/30 text-yellow-400'
                    }`}
                  >
                    {msg.encrypted ? '🔒 Encrypted' : '⚠️ Not Encrypted'}
                  </span>
                </div>

                {/* Entity Key */}
                <div className="mb-4">
                  <p className="text-xs text-slate-400 mb-1">Entity Key:</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs bg-slate-900/50 p-2 rounded border border-slate-700 break-all flex-1">
                      {msg.entityKey}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(msg.entityKey)
                        alert('Entity key copied!')
                      }}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>

                {/* Message Content */}
                <div className="mb-4">
                  <p className="text-xs text-slate-400 mb-1">Content (Decrypted):</p>
                  <p className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white">
                    {msg.data?.content || 'N/A'}
                  </p>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">From:</p>
                    <p className="text-sm text-white">{msg.data?.from || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Type:</p>
                    <p className="text-sm text-white">{msg.data?.type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Source:</p>
                    <p className="text-sm text-white">{msg.data?.source || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">UUID:</p>
                    <p className="text-sm text-white font-mono text-xs">
                      {msg.data?.uuid || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Encrypted/Decrypted Data Display */}
                {msg.encrypted && msg.encryptedData && (
                  <details className="mb-2">
                    <summary className="text-xs text-blue-400 cursor-pointer hover:text-blue-300 mb-2">
                      🔒 View Encrypted Data
                    </summary>
                    <textarea
                      value={msg.encryptedData}
                      readOnly
                      className="w-full bg-blue-900/20 border border-blue-700/50 rounded-lg p-2 text-blue-300 font-mono text-xs resize-none break-all"
                      rows={3}
                    />
                  </details>
                )}

                {msg.encrypted && msg.decryptedData && (
                  <details className="mb-2">
                    <summary className="text-xs text-green-400 cursor-pointer hover:text-green-300 mb-2">
                      🔓 View Decrypted Data (Raw)
                    </summary>
                    <textarea
                      value={msg.decryptedData}
                      readOnly
                      className="w-full bg-green-900/20 border border-green-700/50 rounded-lg p-2 text-green-300 font-mono text-xs resize-none break-all"
                      rows={3}
                    />
                  </details>
                )}

                {/* Full Data View */}
                <details>
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                    View Full JSON Data
                  </summary>
                  <pre className="mt-2 p-3 bg-slate-900/50 rounded text-xs overflow-auto max-h-60 border border-slate-700">
                    {JSON.stringify(msg, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && messages.length === 0 && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8 text-center">
            <p className="text-slate-400 text-lg">No messages found</p>
            <p className="text-slate-500 text-sm mt-2">
              Try adjusting your filters or check if there are any messages stored in Arkiv
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

