
import {Input, Button} from "@nextui-org/react";
import { XXNetwork, XXLogs, XXDirectMessages, XXDirectMessagesReceived, XXDMSend, XXMsgSender, XXMyCredentials } from "./xxdk";
import DHT11Sensor from "./components/DHT11Sensor";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-gray-900/80 border-b border-gray-800/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Client 1</h1>
                <p className="text-xs text-gray-400">Secure Network Connection</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-400">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* DHT11 Sensor Section */}
          <div className="mb-8">
            <DHT11Sensor pin={4} autoRefresh={true} refreshInterval={5000} retries={3} />
          </div>

          <XXNetwork>
            <XXDirectMessages>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Credentials and Sender */}
                <div className="space-y-6">
                  {/* Credentials Card */}
                  <div>
                    <XXMyCredentials />
                  </div>

                  {/* Message Sender Card */}
                  <div>
                    <XXMsgSender />
                  </div>
                </div>

                {/* Right Column - Received Messages */}
                <div className="lg:sticky lg:top-20 h-fit">
                  <div className="rounded-xl border border-gray-800/50 bg-gradient-to-br from-gray-900/95 to-gray-800/95 shadow-xl backdrop-blur-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-800/50 bg-gradient-to-r from-gray-900/50 to-gray-800/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-white">Received Messages</h2>
                          <p className="text-xs text-gray-400">Incoming secure messages</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-grow flex-col max-h-[600px] overflow-y-auto overflow-x-wrap p-6 [overflow-anchor:none] bg-gray-900/30">
                      <XXDirectMessagesReceived />
                      <div id="anchor2" className="h-1 [overflow-anchor:auto]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </XXDirectMessages>
          </XXNetwork>
        </div>
      </div>
    </main>
  );
}


