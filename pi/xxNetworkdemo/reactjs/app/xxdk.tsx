'use client';

import { createContext, useState, useEffect, useContext, MouseEventHandler, useRef, useCallback } from 'react';

import { Console, Hook, Unhook } from 'console-feed'

import XXNDF from './ndf.json'

import { CMix, DMClient, DMReceivedCallback, XXDKUtils } from '@/public/xxdk-wasm/dist/src';
import { Button } from '@nextui-org/button';
import { Input } from '@nextui-org/input';
import Dexie from 'dexie';
import { DBConversation, DBDirectMessage } from '@/public/xxdk-wasm/dist/src/types/db';
const xxdk = require('xxdk-wasm');

// XXContext is used to pass in "XXDKUtils", which
// provides access to all xx network functions to the children
 
const XXContext = createContext<XXDKUtils | null>(null);
const XXNet = createContext<CMix | null>(null);
export function XXNetwork({ children }: { children: React.ReactNode }) {
    const [XXDKUtils, setXXDKUtils] = useState<XXDKUtils | null>(null)
    const [XXCMix, setXXCMix] = useState<CMix | null>(null);

    useEffect(() => {
        // By default the library uses an s3 bucket endpoint to download at
        // https://elixxir-bins.s3-us-west-1.amazonaws.com/wasm/xxdk-wasm-[semver]
        // the wasm resources, but you can host them locally by
        // symlinking your public directory:
        //   cd public && ln -s ../node_modules/xxdk-wasm xxdk-wasm && cd ..
        // Then override with this function here:
        xxdk.setXXDKBasePath(window!.location.href + 'xxdk-wasm');
        xxdk.InitXXDK().then(async(xx: XXDKUtils) => {
            setXXDKUtils(xx)

            // Now set up cMix, while other examples download
            // you must hard code the ndf file for now in your application.          
            const ndf = JSON.stringify(XXNDF)

            // The statePath is a localStorage path that holds cMix xx network state
            const statePath = "xx"

            // Instantiate a user with the state directory password "Hello"
            const secret = Buffer.from("Hello");
            const cMixParamsJSON = Buffer.from("");

            console.log(secret)

            const stateExists = localStorage.getItem('cMixInitialized');
            if (stateExists === null || !stateExists) {
                await xx.NewCmix(ndf, statePath, secret, "")
                localStorage.setItem('cMixInitialized', 'true');
            }
            xx.LoadCmix(statePath, secret, cMixParamsJSON).then((net: CMix) => {
                setXXCMix(net)
            })
        });
    }, [])

    return (
        <XXContext.Provider value={XXDKUtils}>
            <XXNet.Provider value={XXCMix}>
            { children }
            </XXNet.Provider>
        </XXContext.Provider>
    )
}


export function XXLogs() {
    const [logs, setLogs] = useState([])

    useEffect(() => {
      const hookedConsole = Hook(
        window.console,
        (log) => setLogs((currLogs) => [...currLogs, log]),
        false
      )
      return () => Unhook(hookedConsole)
    }, [])
  
    return (
        <div className="flex [overflow-anchor:none]">
            <Console logs={logs} variant="dark" />
        </div>
    )
}


// XXDirectMessages is used to pass "XXDMReceiver", which
// stores callbacks of events from the xxdk api for
// direct messages
const XXDMReceiver = createContext<String[]>([]);
const XXDMClient = createContext<DMClient | null>(null);

export function XXDirectMessages({ children }: { children: React.ReactNode }) {
    const xx = useContext(XXContext)
    const xxNet = useContext(XXNet)

    const [dmReceiver, setDMReceiver] = useState<String[]>([]);
    const [dmClient, setDMClient] = useState<DMClient | null>(null);
    // NOTE: a ref is used instead of state because changes should not
    // cause a rerender, and also our handler function will need
    // to be able to access the db object when it is set.
    const dmDB = useRef<Dexie | null>(null);

    useEffect(() => {
        if (xx === null || xxNet === null) {
            return;
        }
        
        var dmIDStr = localStorage.getItem("MyDMID");
        if (dmIDStr === null) {
            console.log("Generating DM Identity...");
            // NOTE: This will be deprecated in favor of generateCodenameIdentity(...)
            dmIDStr = Buffer.from(xx.GenerateChannelIdentity(xxNet.GetID())).toString('base64');
            localStorage.setItem("MyDMID", dmIDStr);
        }
        console.log("Exported Codename Blob: " + dmIDStr);
        // Note: we parse to convert to Byte Array
        const dmID = new Uint8Array(Buffer.from(dmIDStr, 'base64'));

        // Web does not support notifications, so we use a dummy call
        var notifications = xx.LoadNotificationsDummy(xxNet.GetID());

        // DatabaseCipher encrypts using the given password, the max
        // size here the max for xx network DMs. 
        const cipher = xx.NewDatabaseCipher(xxNet.GetID(),
            Buffer.from("MessageStoragePassword"), 725);

        // 🟢 RECEIVER: Event handler that processes incoming messages
        // This callback is triggered when THIS client receives a message
        const onDmEvent = (eventType: number, data: Uint8Array) => {
            const msg = Buffer.from(data)
            console.log("onDmEvent called -> EventType: " + eventType + ", data: " + msg);

            // 📥 RECEIVING: Add event message to receiver state
            dmReceiver.push(msg.toString('utf-8'));
            setDMReceiver([...dmReceiver]);

            const db = dmDB.current
            if (db !== null) {
                console.log("XXDB Lookup!!!!")
                // If we have a valid db object, we can
                // look up messages in the db and decrypt their contents
                const e = JSON.parse(msg.toString("utf-8"));
                // 🔍 RECEIVER: Looks up message in IndexedDB using event data
                Promise.all([
                    db.table<DBDirectMessage>("messages")
                        .where('id')
                        .equals(e.uuid)
                        .first(),
                    db.table<DBConversation>("conversations")
                        .filter((c) => c.pub_key === e.pubKey)  // ← Looks up by recipient's pub key
                        .last()
                ]).then(([message, conversation]) => {
                    if (!conversation) {
                        console.log(e);
                        console.error("XXDB Couldn't find conversation in database: " + e.pubKey);
                        return;
                    }
                    if (!message) {
                        console.log(e);
                        console.error("XXDB Couldn't find message in database: " + e.uuid);
                        return;
                    }

                    // 🔓 RECEIVER: Decrypts the message text
                    const plaintext = Buffer.from(cipher.Decrypt(message.text));
                    dmReceiver.push("Decrypted Message: " + plaintext.toString('utf-8'));
                    setDMReceiver([...dmReceiver]);
        
                });
            }
        }

        // Start a wasm worker for indexedDB that handles 
        // DM reads and writes and create DM object with it
        xxdk.dmIndexedDbWorkerPath()
            .then((workerPath: string) => {
                // NOTE: important to explicitly convert to string here
                // will be fixed in future releases.
                const workerStr = workerPath.toString()
                console.log("✅ DM Worker Path: " + workerPath.toString());
            // 🆔 IDENTITY CREATION: Creates DM client with THIS identity
            // This client will be BOTH sender and receiver (same identity)
            xx.NewDMClientWithIndexedDb(xxNet.GetID(), notifications.GetID(),
                cipher.GetID(), workerStr, dmID,
                { EventUpdate: onDmEvent                 })
                .then((client) => {
                    // 🆔 CLIENT IDENTITY: Logs THIS client's token and public key
                    // ⚠️ This same public key is used as BOTH sender and recipient!
                    console.log("✅ DMTOKEN: " + client.GetToken());      // ← This client's token
                    console.log("✅ DMPUBKEY: " + Buffer.from(client.GetPublicKey()).toString('base64')); // ← This client's pub key

                    // Once we know our public key, that is the name of our database
                    // We have to remove the padding from base64 to get the db name
                    const dbName = Buffer.from(client.GetPublicKey()).toString('base64').replace(/={1,2}$/, '');
                    const db = new Dexie(dbName + "_speakeasy_dm")
                    db.open().then(() => {
                        console.log(db);
                        dmDB.current = db;
                    });

                    // Once all of our clients are loaded we can start
                    // listening to the network
                    // Increased timeout for Raspberry Pi (slower hardware)
                    xxNet.StartNetworkFollower(10000);
                    xxNet.WaitForNetwork(60000)  // Increased from 30s to 60s for Pi
                        .then(() => {
                            console.log("✅ Network is ready");
                        })
                        .catch((err) => {
                            console.error("❌ Network wait failed:", err);
                        });

                    // When the network goes healthy, signal that to anything
                    // waiting on the client that it is ready.
                    setDMClient(client);
                    console.log("✅ DM Client initialized and ready!");
                })
                .catch((err) => {
                    console.error("❌ Failed to initialize DM client:", err);
                });
        })
        .catch((err) => {
            console.error("❌ Failed to get DM IndexedDB worker path:", err);
        });
    }, [xx, xxNet]);

    return (
        <XXDMClient.Provider value={dmClient}>
            <XXDMReceiver.Provider value={dmReceiver}>
            { children }
            </XXDMReceiver.Provider>
        </XXDMClient.Provider>
    );
}

// ============================================================================
// 📤 SENDER vs 📥 RECEIVER EXPLANATION:
// ============================================================================
// This is a SELF-MESSAGING scenario where the same DM client acts as BOTH:
// 
// SENDER (see XXDMSend function below):
//   - Gets own public key: dm.GetPublicKey() → "myPubkey"
//   - Gets own token: dm.GetToken() → "myToken"  
//   - Sends message TO ITSELF: dm.SendText(myPubkey, myToken, ...)
//   - Meaning: Sends to own public key (loopback/self-test scenario)
//
// RECEIVER (see onDmEvent callback in XXDirectMessages function):
//   - Same client receives via onDmEvent callback (registered at line 188)
//   - Looks up message in IndexedDB by public key (e.pubKey at line 154)
//   - Decrypts message using cipher.Decrypt() (line 169)
//   - Displays in XXDirectMessagesReceived component (lines 283-296)
//
// FLOW: User types message → XXDMSend() → Sent to own pubkey → 
//       Network routes it → onDmEvent() → Decrypted → Displayed
// ============================================================================

// XXDMSend - Updated to send to another user
export async function XXDMSend(
    dm: DMClient, 
    msg: string,
    recipientPubKey: string,  // base64 encoded
    recipientToken: string    // token as string (will be parsed to number)
): Promise<boolean> {
    // Convert base64 string to Uint8Array
    const pubkeyBytes = new Uint8Array(Buffer.from(recipientPubKey, 'base64'));
    
    // Convert token string to number (required by SendText API)
    const tokenNum = parseInt(recipientToken, 10);
    
    // 🔴 SENDING: Sends message to RECIPIENT (not self)
    return await dm.SendText(
        pubkeyBytes,           // Uint8Array: recipient's public key
        tokenNum,              // number: recipient's token (parsed from string)
        msg,                   // string: message text
        0,                     // number: leaseTimeMS (use 0 for default)
        new Uint8Array(0)      // Uint8Array: empty cmixParams
    ).then((sendReport) => {
        console.log("✅ Message sent successfully:", sendReport);
        return true;
    }).catch((err) => {
        console.log("❌ Could not send: " + err)
        return false
    });
}

// Component to display this client's credentials
export function XXMyCredentials() {
    const dm = useContext(XXDMClient);
    const xx = useContext(XXContext);
    const xxNet = useContext(XXNet);
    const [initStatus, setInitStatus] = useState<string>("");

    useEffect(() => {
        if (!xx) {
            setInitStatus("Initializing xxdk...");
        } else if (!xxNet) {
            setInitStatus("Loading network...");
        } else if (!dm) {
            setInitStatus("Initializing DM client... (this may take 30-60 seconds on Raspberry Pi)");
        } else {
            setInitStatus("✅ Client ready!");
        }
    }, [xx, xxNet, dm]);

    if (dm === null) {
        return (
            <div className="p-4 bg-yellow-900/20 rounded space-y-2">
                <div className="flex items-center gap-2">
                    <span className="animate-pulse">⏳</span>
                    <span>{initStatus}</span>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                    {!xx && "Loading xxdk WASM library..."}
                    {xx && !xxNet && "Connecting to xx network..."}
                    {xx && xxNet && !dm && "Creating DM client identity... Please wait."}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                    💡 Check browser console (F12) for detailed progress logs
                </div>
            </div>
        );
    }

    const myToken = dm.GetToken();
    const myPubkey = Buffer.from(dm.GetPublicKey()).toString('base64');

    return (
        <div className="p-4 bg-blue-900/20 rounded space-y-2">
            <h3 className="text-lg font-bold">📋 MY CREDENTIALS (Share these with the other user)</h3>
            <div>
                <p className="font-semibold">My Token:</p>
                <code className="block p-2 bg-black/50 rounded text-xs break-all">{myToken}</code>
            </div>
            <div>
                <p className="font-semibold">My Public Key:</p>
                <code className="block p-2 bg-black/50 rounded text-xs break-all">{myPubkey}</code>
            </div>
        </div>
    );
}

export function XXMsgSender() {
    const dm = useContext(XXDMClient);
    // Hardcoded recipient credentials
    const recipientToken = "3155429120";
    const recipientPubKey = "bIwv9kXXGAhJ41qG/7HpUfI22NziMKkLsOogpXWooE0=";
    
    const [isSendingContinuously, setIsSendingContinuously] = useState<boolean>(false);
    const [sendCount, setSendCount] = useState<number>(0);

    // Function to send sensor data
    const sendSensorData = useCallback(async () => {
        if (dm === null) {
            return;
        }

        try {
            // Fetch latest sensor data
            const response = await fetch('/api/dht11?pin=4&retries=3');
            const sensorData = await response.json();

            if (sensorData.success) {
                // Format sensor data as JSON message
                const messageData = JSON.stringify({
                    type: "sensor_data",
                    timestamp: sensorData.timestamp,
                    temperature: sensorData.temperature || sensorData.temperatureCelsius,
                    humidity: sensorData.humidity || sensorData.humidityPercent,
                    pin: sensorData.pin,
                    sensorType: sensorData.sensorType || "DHT11"
                });

                // Send the formatted sensor data as message
                if (await XXDMSend(dm, messageData, recipientPubKey, recipientToken)) {
                    setSendCount(prev => prev + 1);
                    console.log("✅ Sensor data sent to recipient:", messageData);
                }
            }
        } catch (error) {
            console.error("Error fetching/sending sensor data:", error);
        }
    }, [dm, recipientPubKey, recipientToken]);

    // Continuous sending effect
    useEffect(() => {
        if (!isSendingContinuously) {
            return;
        }

        // Send immediately on start
        sendSensorData();

        // Then send every 3 seconds
        const intervalId = setInterval(() => {
            sendSensorData();
        }, 3000);

        return () => {
            clearInterval(intervalId);
        };
    }, [isSendingContinuously, sendSensorData]);

    const handleStartSending = () => {
        if (dm === null) {
            alert("DM Client not ready yet!");
            return;
        }
        setIsSendingContinuously(true);
        setSendCount(0);
    };

    const handleStopSending = () => {
        setIsSendingContinuously(false);
    };

    return (
        <div className="rounded-xl border border-gray-800/50 bg-gradient-to-br from-gray-900/95 to-gray-800/95 shadow-xl backdrop-blur-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800/50 bg-gradient-to-r from-gray-900/50 to-gray-800/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Sensor Data Transmission</h3>
                        <p className="text-xs text-gray-400">Continuous sensor data stream</p>
                    </div>
                </div>
            </div>
            <div className="p-8 space-y-6">
                {isSendingContinuously && (
                    <div className="p-5 bg-blue-500/10 border border-blue-500/30 rounded-xl backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                                    <div className="absolute inset-0 w-3 h-3 bg-blue-400 rounded-full animate-ping opacity-75"></div>
                                </div>
                                <p className="text-base text-blue-400 font-semibold">Transmitting...</p>
                            </div>
                            <div className="px-4 py-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                                <span className="text-lg text-blue-300 font-bold">{sendCount}</span>
                                <span className="text-xs text-blue-400 ml-1">messages</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-300/80">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Sending sensor data every 3 seconds</span>
                        </div>
                    </div>
                )}

                <div className="flex flex-col items-center gap-4">
                    {!isSendingContinuously ? (
                        <Button 
                            size="lg" 
                            color="primary" 
                            onPress={handleStartSending}
                            isDisabled={dm === null}
                            className="font-medium bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-500 hover:via-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-green-500/50 hover:shadow-xl hover:shadow-green-500/50 transition-all duration-300 px-12 py-8 text-lg"
                        >
                            <span className="flex items-center gap-3">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Start Transmission</span>
                            </span>
                        </Button>
                    ) : (
                        <Button 
                            size="lg" 
                            color="danger" 
                            onPress={handleStopSending}
                            className="font-medium bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:via-rose-500 hover:to-pink-500 text-white shadow-lg shadow-red-500/50 hover:shadow-xl hover:shadow-red-500/50 transition-all duration-300 px-12 py-8 text-lg"
                        >
                            <span className="flex items-center gap-3">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                </svg>
                                <span>Stop Transmission</span>
                            </span>
                        </Button>
                    )}
                    
                    <p className="text-sm text-gray-400 text-center max-w-md">
                        {isSendingContinuously 
                            ? "Sensor data is being transmitted continuously every 3 seconds" 
                            : "Click to start transmitting sensor data (temperature & humidity) continuously"}
                    </p>
                </div>
            </div>
        </div>
    )
}

// 📥 RECEIVER DISPLAY: Shows messages received by THIS client
// This component displays messages that were received via onDmEvent callback
export function XXDirectMessagesReceived() {
    // Gets messages from XXDMReceiver context (populated by onDmEvent)
    const msgs = useContext(XXDMReceiver);

    if (msgs === null || msgs.length == 0) {
        return (
            <div>Nothing yet...</div>
        )
    }

    // 📥 DISPLAY: Renders all received messages (including decrypted ones)
    const msgOut = msgs.map(m => <div className="[overflow-anchor:none]">{m}</div>);
    return (
        msgOut
    )
}