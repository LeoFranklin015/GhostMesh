'use client';

import { createContext, useState, useEffect, useContext, MouseEventHandler, useRef } from 'react';

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
    const [msgToSend, setMessage] = useState<string>("");
    const [recipientPubKey, setRecipientPubKey] = useState<string>("");
    const [recipientToken, setRecipientToken] = useState<string>("");

    const handleSubmit = async () => {
        if (dm === null) {
            alert("DM Client not ready yet!");
            return;
        }
        if (!recipientPubKey || !recipientToken) {
            alert("Please enter recipient's public key and token!");
            return;
        }
        if (!msgToSend) {
            alert("Please enter a message!");
            return;
        }
        
        if (await XXDMSend(dm, msgToSend, recipientPubKey, recipientToken)) {
            setMessage("");
            console.log("✅ Message sent to recipient");
        }
    }

    return (
        <div className="space-y-4 p-4 bg-green-900/20 rounded">
            <h3 className="text-lg font-bold">📤 SEND MESSAGE TO OTHER USER</h3>
            
            <div>
                <label className="block mb-1 font-semibold">Recipient's Token:</label>
                <Input 
                    type="text" 
                    placeholder="Paste recipient's token here..."
                    value={recipientToken}
                    onChange={(e) => setRecipientToken(e.target.value)}
                />
            </div>
            
            <div>
                <label className="block mb-1 font-semibold">Recipient's Public Key:</label>
                <Input 
                    type="text" 
                    placeholder="Paste recipient's public key here..."
                    value={recipientPubKey}
                    onChange={(e) => setRecipientPubKey(e.target.value)}
                />
            </div>

            <div>
                <label className="block mb-1 font-semibold">Message:</label>
                <Input 
                    type="text" 
                    placeholder="Type message to send..."
                    value={msgToSend}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                />
            </div>

            <Button size="md" color="primary" onClick={handleSubmit} fullWidth>
                Send Message
            </Button>
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