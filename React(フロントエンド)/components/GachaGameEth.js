import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Container, Button, InputGroup, FormControl, Row, Col, Image, Alert,Card} from 'react-bootstrap';
import styled from 'styled-components';
import GachaGameContract from '../contracts/GachaNFTAuto.json';
import './css/styles.css';
import './css/a.css';


function GachaGame() {
  const [account, setAccount] = useState(null);
  const [userSeed, setUserSeed] = useState('0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef1234');
  const [luckyNumber, setLuckyNumber] = useState(null);
  const [eventActive, setEventActive] = useState(false);
  const [resultRevealed, setResultRevealed] = useState(false);
  const [imageURL, setImageURL] = useState(null);
  const [nftOpenSeaUrl, setNftOpenSeaUrl] = useState(null);
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [userSeedDisplayed, setUserSeedDisplayed] = useState('');
  const [serverSeed, setServerSeed] = useState('');
  const [contractAddress, setContractAddress] = useState(null);

  useEffect(() => {
    async function init() {
      // MetaMaskプロバイダーを設定
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // ユーザーアカウントを取得
      const accounts = await provider.listAccounts();
      setAccount(accounts[0]);
      
      // コントラクトインスタンスを作成
      const network = await provider.getNetwork();
      const contractAddress = GachaGameContract.networks[network.chainId].address;
      console.log('contractAddress',contractAddress);

      const contract = new ethers.Contract(contractAddress, GachaGameContract.abi, signer);
      
      // 状態をセット
      setProvider(provider);
      setSigner(signer);
      setContract(contract);
      setContractAddress(contractAddress);

    }

    init();
  }, []);

  useEffect(() => {
    if (contract) {
      // Commitmentイベントのリッスンを追加
      const commitmentEvent = contract.on('Commitment', () => {
        alert('ガチャイベントが開催されています！');
        setEventActive(true);
      });

      // Revealイベントのリッスンを追加
      const revealEvent = contract.on('Reveal', () => {
        alert('結果が出ています');
        setResultRevealed(true);
        setEventActive(false);
      });

      // NFTMintedイベントのリッスンを追加
      const nftMintedEvent = contract.on('NFTMinted', (owner, tokenId, event) => {
         const openSeaUrl =`https://testnets.opensea.io/assets/sepolia/${contractAddress}/${tokenId}`;
          
         console.log('NFT Minted!', tokenId);
          console.log('OpenSea URL:', openSeaUrl);
          console.log('contractAddress:', contractAddress);
          
          setNftOpenSeaUrl(openSeaUrl);
          localStorage.setItem('nftOpenSeaUrl', openSeaUrl);
      //  }
      });

      // ページがロードされたときにローカルストレージからOpenSea URLを取得
      const storedNftOpenSeaUrl = localStorage.getItem('nftOpenSeaUrl');
      if (storedNftOpenSeaUrl) {
        setNftOpenSeaUrl(storedNftOpenSeaUrl);
      }

      // イベントリスナーのクリーンアップ
      return () => {
        contract.off('Commitment', commitmentEvent);
        contract.off('Reveal', revealEvent);
        contract.off('NFTMinted', nftMintedEvent);
      };
    }
  }, [contract, account]);

  // participate関数を更新
  async function participate() {
    const userSeedHash = ethers.utils.keccak256(userSeed);

    // メッセージをハッシュ化して署名
    const messageHash = ethers.utils.solidityKeccak256(['bytes32'], [userSeedHash]);
    const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));

    // 署名をコントラクトに送信
    const tx = await contract.participate(userSeedHash, signature);
    await tx.wait();

    localStorage.setItem('userSeed', userSeed);
  }

  // fetchResult関数を更新
  async function fetchResult() {
    try {
      const result = await contract.luckyNumber();
      const userSeed = await contract.userSeed();
      const serverSeed = await contract.serverSeed();
      setLuckyNumber(result);
      // 状態を更新してUI上でシードを表示
      setUserSeedDisplayed(userSeed);
      setServerSeed(serverSeed);
      const prizeData = await contract.getPrize(result);
      const metadataIPFSUrl = prizeData[2];
      const metadataHTTPUrl = getHttpGatewayUrl(metadataIPFSUrl);
      const metadataResponse = await fetch(metadataHTTPUrl);
      const metadata = await metadataResponse.json();

      const imageIPFSUrl = metadata.image;
      const imageHTTPUrl = getHttpGatewayUrl(imageIPFSUrl);
      setImageURL(imageHTTPUrl);
    } catch (error) {
      console.error("Error fetching result:", error);
    }
  }

  function getHttpGatewayUrl(ipfsUri) {
    if (ipfsUri.startsWith('https://')) {
      return ipfsUri;
    }
    const path = ipfsUri.split('ipfs://')[1];
    return `https://cloudflare-ipfs.com/ipfs/${path}`;
  }

  function generateRandomByte32() {
    const randomHex = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    return randomHex;
  }

  // requestCommit関数を更新
  async function requestCommit() {
    if (!account) {
      console.error('ウォレットが接続されていません。');
      return;
    }
    try {
      const tx = await contract.requestCommit(account);
      await tx.wait();
      console.log('requestCommitが成功しました。');
    } catch (error) {
      console.error('requestCommitの実行中にエラーが発生しました:', error);
    }
  }
  // fetchSeeds関数を追加
  async function fetchSeeds() {
    try {
      const userSeedFromContract = await contract.getUserSeed(account);
      setUserSeedDisplayed(userSeedFromContract);

      const serverSeedFromContract = await contract.getServerSeed();
      setServerSeed(serverSeedFromContract);
    } catch (error) {
      console.error("Error fetching seeds:", error);
    }
  }
  // コンポーネントをレンダリング
  return (
    <div style={{ backgroundColor: 'black', height: '100vh', paddingTop: '2px' }}>
        <Container className="d-flex flex-column align-items-center" style={{ height: 'calc(100vh - 2px)' }}>
         <InputGroup className="mb-3">
        <FormControl
          style={{ width: '300px' }}
          type="text"
          value={userSeed}
          onChange={(e) => setUserSeed(e.target.value)}
          placeholder="Enter your seed"
        />
      </InputGroup>
      <Button variant="primary" className="px-4 py-2 mb-3" onClick={requestCommit}>Request Commit</Button>

      <Button variant="primary" className="px-4 py-2 mb-3" onClick={participate}>Participate</Button>
      <Button variant="secondary" className="px-4 py-2 mb-3" onClick={() => setUserSeed(generateRandomByte32())}>Generate Random Seed</Button>
      <Alert variant={eventActive ? 'success' : 'danger'} className="w-100 text-center mt-2">
        {eventActive ? 'ガチャイベントが開催されています！' : 'ガチャイベントは現在開催されていません。'}
      </Alert>
      {resultRevealed && (
        <Alert variant="info" className="w-100 text-center mt-2">
          結果が出ています。
        </Alert>
      )}
      <Button variant="info" className="px-4 py-2 mb-3" onClick={fetchResult}>Fetch Result</Button>

      {luckyNumber !== null && (
        <Row className="justify-content-center mt-3">
          <Col xs={12} className="text-center text-white">
            Result: {String(luckyNumber)}
          </Col>
        </Row>
      )}

      {luckyNumber <= 9 && (
        <Row className="justify-content-center mt-3">
          <Col xs={12} className="text-center">
            <Image src={imageURL} alt="Prize Image" />
          </Col>
        </Row>
      )}

      {nftOpenSeaUrl && (
        <Row className="justify-content-center mt-3">
          <Col xs={12} className="text-center text-white">
            Your NFT is viewable on OpenSea: <a href={nftOpenSeaUrl} target="_blank" rel="noopener noreferrer" className="text-white">Click here</a>
          </Col>
        </Row>
      )}


          {/* 以下で使用したシードを表示 */}

      <Row className="justify-content-center mt-3">
  <Col xs={12} className="text-center text-white">
  使用したUser Seed: {userSeedDisplayed}
  </Col>
</Row>
      {serverSeed && (
        <Row className="justify-content-center mt-3">
          <Col xs={12} className="text-center text-white">
            使用したサーバーシード: {serverSeed}
          </Col>
        </Row>
      )}
    </Container>
    </div>

  );
}

export default GachaGame;
