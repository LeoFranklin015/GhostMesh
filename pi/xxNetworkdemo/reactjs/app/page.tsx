
import {Input, Button} from "@nextui-org/react";
import { XXNetwork, XXLogs, XXDirectMessages, XXDirectMessagesReceived, XXDMSend, XXMsgSender, XXMyCredentials } from "./xxdk";
import DHT11Sensor from "./components/DHT11Sensor";

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen items-center p-10 space-y-4">
      <h1 className="text-3xl font-bold">🟢 CLIENT 1</h1>
      
      {/* DHT11 Sensor Readings */}
      <div className="w-4/5 mb-4">
        <DHT11Sensor pin={4} autoRefresh={true} refreshInterval={5000} retries={3} />
      </div>

      <XXNetwork>
      <XXDirectMessages>
        {/* Display this client's credentials */}
        <div className="w-4/5 mb-4">
          <XXMyCredentials />
        </div>

        {/* Message sender with input for recipient credentials */}
        <div className="w-4/5 mb-4">
          <XXMsgSender />
        </div>

        {/* Received messages display */}
        <div className="flex-grow flex-col max-h-96 overflow-y-auto overflow-x-wrap w-4/5 border border-gray-300 m-0 [overflow-anchor:none]">
          <p className="flex w-full justify-center font-bold p-2">📥 Received Messages</p>
          <XXDirectMessagesReceived />
          <div id="anchor2" className="h-1 [overflow-anchor:auto]"></div>
        </div>
      </XXDirectMessages>
      </XXNetwork>
    </main>
  );
}


