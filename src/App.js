import {useEffect, useState, useRef} from 'react';
import {ethers} from 'ethers';
import {Container} from 'react-bootstrap';
import {} from 'dotenv/config'

import Contract from './component/Contract'
import {Action_Type, Status_Type} from './common/Constant.js';
import contract from './abi/oldContact.json';
import newContract from './abi/newContract.json';
import './App.css';

function App() {
    const [currentAccount, setCurrentAccount] = useState("");
    const [balance, setBalance] = useState(0);
    const [supply, setSupply] = useState(0);
    const [newBalance, setNewBalance] = useState(0);
    const [loading, setLoading] = useState({status: null, message: '', actionType: ''});
    const [network, setNetwork] = useState("");
    const [inputAmount, setInputAmount] = useState(null);

    let nftContract = null, nftNewContract = null, isInitialized = false;

    /**
     *
     * @returns {Promise<void>}
     */
    const connectWalletHandler = async () => {
        const {ethereum} = window;
        if (!ethereum) {
            alert("Please install Metamask!");
        }
        try {
            const accounts = await ethereum.request({method: 'eth_requestAccounts'});
            if (accounts.length !== 0) {
                setCurrentAccount(accounts[0]);
                initContractHandler(accounts[0])
            } else {
                console.log("No authorized account found");
            }
            // handle change account
            ethereum.on('accountsChanged', function (accounts) {
                console.log("account changed");
                setCurrentAccount(accounts[0]);
                initContractHandler(accounts[0])
                console.log(`Selected account changed to ${accounts[0]}`);
            });
        } catch (err) {
            console.log(err)
        }
        ethereum.on('networkChanged', async function (net) {
            console.log("network changed", net);
            //  console.log(" currentAccount",currentAccount);
            const accounts = await ethereum.request({method: 'eth_requestAccounts'});
            if (accounts.length !== 0) {
                setCurrentAccount(accounts[0]);
                initContractHandler(accounts[0])
            } else {
                console.log("No authorized account found");
            }
        }, false);
    }

    /**
     *
     * @param curAccount
     * @returns {Promise<void>}
     */
    const initContractHandler = async (curAccount) => {
        const {ethereum} = window;
        console.log("ethereum", ethereum);
        // attach provider
        const provider = new ethers.providers.Web3Provider(ethereum);
        let {name: network} = await provider.getNetwork();
        console.log("network",network);
        if (network !== process.env.REACT_APP_NETWORK) {
            alert("Please select " + process.env.REACT_APP_NETWORK + " network");
            setNetwork("")
        } else {
            setNetwork(process.env.REACT_APP_NETWORK);
            const signer = provider.getSigner();
            nftContract = new ethers.Contract(process.env.REACT_APP_CONTACT_ADDRESS, contract.abi, signer);
            nftNewContract = new ethers.Contract(process.env.REACT_APP_NEW_CONTACT_ADDRESS, newContract.abi, signer);
            isInitialized = true;

            // set existing contact Balance
            if (!balance && curAccount) {
                let obj = await nftContract.balanceOf(curAccount);
                let ctrbalance = `${obj}`.valueOf()
                setBalance(ctrbalance)
                let newobj = await nftNewContract.balanceOf(curAccount);
                let newctrbalance = +`${newobj}`
                setNewBalance(newctrbalance)
            }
            NewNftTotalSupply()
        }
    }
    /**
     *
     * @returns {Promise<void>}
     * @constructor
     */
    const NewNftMintHandler = async () => {
        if (!isInitialized) {
            await initContractHandler();
        }
        // check allow mint operation
        let num = await canMint();
        console.log("  --- num---",num);
        if ((num -  inputAmount) >= 0) {
            try {
                //alert("test" + inputAmount.current.value)
                let nftTxn = await nftNewContract.mint(inputAmount)
                setLoading({
                    status: Status_Type.PENDING,
                    message: 'Processing.... Please wait',
                    actionType: Action_Type.NEW_MINT
                })

                await nftTxn.wait();
                setLoading({
                    status: Status_Type.SUCCESS,
                    message: `Minting complete please see the transiction  <a target="_blank" rel="noreferrer" href=https://ropsten.etherscan.io/tx/${nftTxn.hash}>here</a>`,
                    actionType: Action_Type.NEW_MINT
                })
                if (nftTxn.hash) {
                    //setNewBalance(+newBalance + 1)
                    setInputAmount(null)
                    NewNftTotalSupply()
                }
            } catch (e) {
                console.log("error", e);
                setLoading({status: Status_Type.ERROR, message: e.message, actionType: Action_Type.NEW_MINT})
                setInputAmount(null)
            }
        } else {
            if(num<=0){
                alert('maximum mint limit reached')
            }
            else{
                alert(`${num} token available for minting`)
            }
        }
    }
    /**
     *
     * @returns {Promise<number>}
     * @constructor
     */
    const NewNftBalanceHandler = async () => {
        if (!isInitialized) {
            await initContractHandler();
        }
        let balance = await nftNewContract.balanceOf(currentAccount);
        let bal = +`${balance}`
        setNewBalance(bal)
        return bal
    }

    const NewNftTotalSupply = async () => {
        if (!isInitialized) {
            await initContractHandler();
        }
        let supply = await nftNewContract.totalSupply();
        let bal = +`${supply}`
        setSupply(bal)
        return bal
    }
    /**
     *
     * @returns {Promise<INT>}
     */
    const canMint = async () => {
        let allow = false;
        const url = `https://api-${process.env.REACT_APP_NETWORK}.etherscan.io/api?module=account&action=tokennfttx&contractaddress=${process.env.REACT_APP_NEW_CONTACT_ADDRESS}&address=${currentAccount}&page=1&offset=100&startblock=0&endblock=27025780&sort=asc&apikey=${process.env.REACT_APP_EATHERSCAN_API_KEY}`
        const response = await fetch(url);
        // waits until the request completes...
        const data = await response.json()
        let res = data.result.filter((item) => {
            return item.to.toLowerCase() === currentAccount.toLowerCase() && item.from === process.env.REACT_APP_DEFAULT_SENDER
        })
        if (balance > (res.length + inputAmount)) {
            allow = true;
        }
        //let pending = newBalance - res.length;
        return balance - res.length;
    }

    useEffect(() => {
        connectWalletHandler();
    }, [])
    const connectWalletButton = () => {
        return (
            <button onClick={connectWalletHandler} className='cta-button connect-wallet-button'>
                Connect Wallet
            </button>
        )
    }
    return (
        <div className='main-app'>
            <h1>Robo-Synths</h1>
            {currentAccount ?
                <>
                    <h3><span>{currentAccount} </span></h3>
                    <div className="mintWrapper">
                        <h4>Rogue Bot Owners Claim Synths Here</h4>
                        <h5>Total tokens that can be minted for this account:{balance} </h5>
                        <h5 className="qty">{`${supply}`}/15777</h5>
                        {network === process.env.REACT_APP_NETWORK && <Container className="containerWrapper">
                            <Contract inputAmount={inputAmount} setInputAmount={setInputAmount}  name={"New Contract"} symbole={"Token ( Gate This Mint)"} balance={newBalance}
                                      loading={loading} contactBalHandler={NewNftTotalSupply}
                                      contactMintHandler={NewNftMintHandler} actionType={Action_Type.NEW_MINT}
                                      CONTACT_ADDRESS={process.env.REACT_APP_NEW_CONTACT_ADDRESS}></Contract>
                        </Container>}
                    </div>
                </> : connectWalletButton()}
        </div>
    )
}

export default App;
