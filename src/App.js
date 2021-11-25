import React, {useState, useEffect} from "react";
import { ethers } from "ethers";
import './App.css';
import contractABI from './utils/abi.json'

const contractAddress = "0x22766Bd75290D13C658038b178CA4E70Eb252dde"

console.log({contractAddress, contractABI})

function useWallet() {
  const [isConnected, setIsConnected] = useState(false);
  const [accounts, setAccounts] = useState([]);

  async function getAccounts() {
    const allAccounts = await window.ethereum.request({
      method: 'eth_accounts'
    }).then((accounts) => {
      console.log('get accounts')
      setAccounts(accounts);
      return accounts;
    }).catch((error) => {
      console.log('error getting accounts')
      console.log(console.error());
    });

    console.log({ allAccounts })
  }

  async function connect() {
    console.log('requesting access')
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });

      setAccounts(accounts);
    } catch (error) {
      console.log({error})
    }
  }

  useEffect(() => {
    const isAvailable = typeof window.ethereum !== 'undefined';

    setIsConnected(isAvailable);
    if (isAvailable) {
      getAccounts();
    }
  }, []);

  return {
    accounts,
    connect,
    isConnected,
  }
}

function useWaveContract() {
  const [isMining, setIsMining] = useState(false);
  const [miningError, setMiningError] = useState(null);
  const [message, setMessage] = useState('');
  const [waves, setWaves] = useState([]);

  useEffect(() => {
    if (!window.ethereum) {
      return;
    }

    let wavePortalContract;

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    wavePortalContract = new ethers.Contract(contractAddress, contractABI.abi, signer);
    wavePortalContract.on('NewWave', handleContractEvent);

    getWaves();
    
    return () => {
      wavePortalContract.off('NewWave', handleContractEvent);
    }
  }, [])

  function changeMessage(event) {
    const message = event.target.value;
    setMessage(message)
  }

  function transformWave(wave) {
    return {
      address: wave.waver,
      timestamp: new Date(wave.timestamp * 1000),
      message: wave.message
    }
  }

  async function handleContractEvent(waver, timestamp, message) {
      console.log('waver :', waver);
      console.log('timestamp :', timestamp);
      console.log('message :', message);

      setWaves((prevWaves) => [...prevWaves, transformWave({ waver, timestamp, message })])
  }

  async function getWaves() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const wavePortalContract = new ethers.Contract(contractAddress, contractABI.abi, signer);

    await wavePortalContract.getAllWaves()
      .then((waves) => {
        console.log({waves})
        return waves.map((wave) => transformWave(wave))
      
      })
      .then(waves => setWaves(waves))
  }

  async function createWave() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const wavePortalContract = new ethers.Contract(contractAddress, contractABI.abi, signer);

    const transaction = await wavePortalContract.wave(message)
      .catch((error) => setMiningError(error))

    if (!transaction) {
      // failuded...
      return;
    }

    setIsMining(true)
    const tx = await transaction.wait()
    setIsMining(false)

    console.log(tx);
    console.log("Mined -- ", tx.hash);

    let count = await wavePortalContract.getTotalWaves();
    console.log("Retrieved total wave count...", count.toNumber());
  }

  return {isMining, createWave, miningError, changeMessage, waves}
}

export default function App() {
  const {accounts, isConnected, connect} = useWallet();
  const {isMining, miningError, changeMessage, createWave, waves} = useWaveContract();

  return (
    <div className="mainContainer">
      <div className="dataContainer">
        {/* <center>{isConnected ? 'Wallet Connected' : 'Wallet Not connected'}</center><br /> */}

        <div className="header">
        👋 The simplest Web3 app lol
        </div>
        <p>
        Send me a public message that will be saved on the ethereum blockchain
        </p>

        <textarea onChange={changeMessage} placeholder="Shoot me a message!" style={{padding: '1.5rem'}} />

        {!isConnected ? (
          <button onClick={connect}>Connect wallet</button>
        ): (
          <button className="waveButton" onClick={createWave}>
          Wave at Me
        </button>
        )}

        {isMining && <p><img src="https://assets-blog.lottiefiles.dev/2021/03/CoMw0bhvYXrDGN6ZDTOWmFAfoIWWR8VxEIAzq9r8.gif" />Minting your transaction</p>}

       
        {waves.map((wave, index) => {
          return (
            <div key={index} style={{ backgroundColor: "OldLace", marginTop: "16px", padding: "8px" }}>
              <h2>{wave.message}</h2>
              <div>Address: {wave.address}</div>
              <div>Time: {wave.timestamp.toString()}</div>
            </div>)
        })}
{/* 
        <p>Accounts</p>
        <ul>
          {accounts.map((account) => (
            <li>{account}</li>
          ))}
        </ul> */}


        {miningError && <p>{JSON.stringify(miningError)}</p>}
      </div>
    </div>
  );
}
