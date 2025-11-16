
import {Input, Button} from "@nextui-org/react";
import { XXNetwork, XXLogs, XXDirectMessages, XXDirectMessagesReceived, XXDMSend, XXMsgSender, XXMyCredentials } from "./xxdk2";

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen items-center p-10 space-y-4">
      <h1 className="text-3xl font-bold">🔵 CLIENT 2</h1>
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


