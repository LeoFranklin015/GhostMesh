'use client';

import {Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure} from "@nextui-org/react";
import { XXNetwork, XXDirectMessages, XXDirectMessagesReceived, XXMsgSender, XXMyCredentials } from "./xxdk";
import DHT11Sensor from "./components/DHT11Sensor";

function CredentialsModalButton() {
  const {isOpen, onOpen, onClose} = useDisclosure();
  
  return (
    <>
      <Button
        size="sm"
        variant="bordered"
        onPress={onOpen}
        className="border-gray-700 text-gray-300 hover:bg-gray-800"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        My Credentials
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside" className="bg-gray-900">
        <ModalContent className="bg-gray-900 border border-gray-800">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 border-b border-gray-800 bg-gray-900">
                <h2 className="text-xl font-bold text-white">My Credentials</h2>
                <p className="text-sm text-gray-400">Share these with other users</p>
              </ModalHeader>
              <ModalBody className="py-6 bg-gray-900">
                <XXNetwork>
                  <XXDirectMessages>
                    <XXMyCredentials />
                  </XXDirectMessages>
                </XXNetwork>
              </ModalBody>
              <ModalFooter className="border-t border-gray-800 bg-gray-900">
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

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
              <CredentialsModalButton />
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
          {/* DHT11 Sensor Section - Keep as before */}
          <div className="mb-8">
            <DHT11Sensor pin={4} autoRefresh={true} refreshInterval={5000} retries={3} />
          </div>

      <XXNetwork>
      <XXDirectMessages>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Carbon Credit, AQI, and Sender */}
                <div className="space-y-6">
                  {/* Carbon Credit and AQI Boxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Carbon Credit Box */}
                    <div className="rounded-xl border border-gray-800/50 bg-gradient-to-br from-gray-900/95 to-gray-800/95 shadow-xl backdrop-blur-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-800/50 bg-gradient-to-r from-gray-900/50 to-gray-800/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">Carbon Credit</h3>
                            <p className="text-xs text-gray-400">Environmental impact</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                        <div className="p-4 rounded-full bg-gray-800/50 border border-gray-700/50 mb-4">
                          <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </div>
                        <p className="text-lg font-semibold text-gray-400 mb-2">Currently Not Available</p>
                        <p className="text-xs text-gray-500 text-center">
                          Carbon credit tracking will be available soon
                        </p>
                      </div>
                    </div>

                    {/* Air Quality Index Box */}
                    <div className="rounded-xl border border-gray-800/50 bg-gradient-to-br from-gray-900/95 to-gray-800/95 shadow-xl backdrop-blur-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-800/50 bg-gradient-to-r from-gray-900/50 to-gray-800/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">Air Quality Index</h3>
                            <p className="text-xs text-gray-400">AQI monitoring</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                        <div className="p-4 rounded-full bg-gray-800/50 border border-gray-700/50 mb-4">
                          <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </div>
                        <p className="text-lg font-semibold text-gray-400 mb-2">Currently Not Available</p>
                        <p className="text-xs text-gray-500 text-center">
                          Air quality monitoring will be available soon
                        </p>
                      </div>
                    </div>
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


