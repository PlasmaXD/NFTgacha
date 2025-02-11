import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import GachaGameContract from '../contracts/GachaNFTAuto.json';
import { Container,Row, Col, Nav , Button, InputGroup, FormControl } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import Table from 'react-bootstrap/Table';

const TokenStats = () => {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [tokenStats, setTokenStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prizeMetadata, setPrizeMetadata] = useState({});
  const [luckyNumbersCount, setLuckyNumbersCount] = useState({});
  const [totalTokensMinted, setTotalTokensMinted] = useState(0);

  useEffect(() => {
    const initializeWeb3 = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);

        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);

        const networkId = await web3Instance.eth.net.getId();
        const deployedAddress = GachaGameContract.networks[networkId].address;
        const contractInstance = new web3Instance.eth.Contract(GachaGameContract.abi, deployedAddress);
        setContract(contractInstance);
      }
    };

    initializeWeb3();
  }, []);

  useEffect(() => {
    const loadTokenStats = async () => {
      if (contract && account) {
        try {
          const tokenCount = await contract.methods.balanceOf(account).call();
          const tokenIds = [];
          for (let i = 0; i < tokenCount; i++) {
            const tokenId = await contract.methods.tokenOfOwnerByIndex(account, i).call();
            tokenIds.push(tokenId);
          }

          const stats = await Promise.all(tokenIds.map(async (tokenId) => {
            const luckyNumber = await contract.methods.getLuckyNumberForToken(tokenId).call();
            const prize = await contract.methods.getPrize(luckyNumber).call();
            return { tokenId, luckyNumber, prize };
          }));

          setTokenStats(stats);
        } catch (error) {
          console.error("Error loading token stats:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadTokenStats();
  }, [contract, account]);

  ////すべてのトークン表示
  useEffect(() => {
    const loadAllTokenStats = async () => {
      if (contract) {
        try {
          const allTokensInfo = await contract.methods.getAllTokensInfo().call();
          setTokenStats(allTokensInfo);
        } catch (error) {
          console.error("Error loading all token stats:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadAllTokenStats();
  }, [contract]);


  useEffect(() => {
    const fetchPrizeMetadata = async () => {
      if (contract) { // ← contractが設定されているか確認
        const metadata = {};
        for (let i = 0; i < 10; i++) {
          const prizeData = await contract.methods.getPrize(i).call();
          const tokenURI = prizeData[2];
          const httpTokenURI = getHttpGatewayUrl(tokenURI);
          const metadataResponse = await fetch(httpTokenURI);
          if (metadataResponse.ok) {
            const prizeMetadata = await metadataResponse.json();
            metadata[i] = prizeMetadata;
          } else {
            console.error("Failed to fetch metadata for lucky number", i);
          }
        }
        setPrizeMetadata(metadata);
      }
    };
  
    fetchPrizeMetadata();
  }, [contract]); // ← contractが変更されたときに再度実行


  useEffect(() => {
    const calculateLuckyNumbersCount = () => {
      const count = {};
      tokenStats.forEach(({ luckyNumber }) => {
        count[luckyNumber] = (count[luckyNumber] || 0) + 1;
      });
      setLuckyNumbersCount(count);
    };

    if (tokenStats.length > 0) {
      calculateLuckyNumbersCount();
    }
  }, [tokenStats]);
  useEffect(() => {
    const fetchLuckyNumbersCount = async () => {
      if (contract) {
        try {
          const counts = {};
          let total = 0;
          for (let i = 0; i < 10; i++) {
            const count = await contract.methods.getLuckyNumberCount(i).call();
            counts[i] = count;
            total += parseInt(count, 10);
          }
          setLuckyNumbersCount(counts);
          setTotalTokensMinted(total);
        } catch (error) {
          console.error("Error fetching lucky numbers count:", error);
        }
      }
    };

    fetchLuckyNumbersCount();
  }, [contract]);



  const getHttpGatewayUrl = (ipfsUri) => {
    // IPFS URIからHTTP URLへの変換
    if (ipfsUri.startsWith('https://')) {
      return ipfsUri;
    }
    const path = ipfsUri.split('ipfs://')[1];
    return `https://cloudflare-ipfs.com/ipfs/${path}`;
  };

  const totalTokens = Object.values(luckyNumbersCount).reduce((sum, count) => sum + count, 0);

  return (
   
    <div>
      <Container>
        <Row className="mb-3">
          <Col>
            <h2>Top</h2>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            <Button href="/" variant="primary" size="lg" style={{ fontSize: '24px' }}>ガチャを引くページへ</Button>
          </Col>
        </Row>
      </Container>

       {Object.keys(prizeMetadata).length > 0 && totalTokensMinted > 0 && (
        <div>
          <h3>景品と排出率</h3>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>景品番号</th>
                <th>排出個数</th>
                <th>排出率</th>
                <th>画像</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(prizeMetadata).map(number => (
                <tr key={number}>
                  <td>{number}</td>
                  <td>{luckyNumbersCount[number] || 0}</td>
                  <td>{((luckyNumbersCount[number] || 0) / totalTokensMinted * 100).toFixed(2)}%</td>
                  <td><img src={getHttpGatewayUrl(prizeMetadata[number].image)} alt={prizeMetadata[number].name} width="100" /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
<Container>
  <a href="/server">Admin Page</a><a href="/NFTmanage">景品管理画面</a>
</Container>


    </div>
  );
};

export default TokenStats;
