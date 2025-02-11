import { BrowserRouter as Router, Route, Routes, Link, useParams, useNavigate,useHistory } from 'react-router-dom';
import React, { useState } from 'react';

import GachaGame from './components/GachaGame';
import GachaGameEth from './components/GachaGameEth';
import GachaGameEthRefund from './components/GachaGameEthRefund';


import OtherContractScreen from './components/OtherContractScreen';
import ServerContractScreen from './components/Server';
import ServerContractScreenRefund from './components/ServerRefund';

import NFTContractScreen from './components/NFTContractScreen';
import TokenDisplay0 from './components/TokenDisplay0';
import TokenDisplay from './components/TokenDisplay';
import NFTmanage from './components/NFTmanage';
import NFTmanage2 from './components/NFTmanageProb';
import NFTmanageRefund from './components/NFTmanageRefund';

import TokenStats from './components/TokenStats';
import TokenStats2 from './components/TokenStats2';


import GachaGameEthBulk from './components/GachaGameEthBulk';


//import NFTMekleContractScreen from './components/NFTMekleContractScreen';GachaNFT


import database from './database';  

function App() {
  const [ipfsUrl, setIpfsUrl] = useState('');

  return (
    <Router>
      <div>
        <nav>
          <ul>
            <li>
              <Link to="/">ユーザー</Link>
            </li>
            <li>
              <Link to="/userEth">ユーザーEth</Link>
            </li>
            <li>
              <Link to="/userEthRefund">ユーザーEthRefund</Link>
            </li>
             <li>
              <Link to="/server">運営</Link>
            </li> 
            <li>
              <Link to="/serverRefund">運営Refund</Link>
            </li>
            <li>
              <Link to="/token0">exchange</Link>
            </li>
            <li>
              <Link to="/token">My Tokens</Link>
            </li>
          
            <li>
              <Link to="/NFTmanage">NFTmanage</Link> 
            </li>
            <li>
              <Link to="/NFTmanage2">NFTmanage2</Link> 
            </li>
            <li>
              <Link to="/NFTmanageRefund">NFTmanageRefund</Link> 
            </li>
            <li>
              <Link to="/TokenStats">TokenStats</Link>  
            </li>
            <li>
              <Link to="/TokenStats2">TokenStats2</Link>  
            </li>
            <li>
              <Link to="/Bulk参加">Bulk参加</Link>  
            </li>
       
          </ul>
        </nav>

        <Routes>
          <Route path="/other" element={<OtherContractScreen />} />
          <Route path="/server" element={<ServerContractScreen />} />
          <Route path="/serverRefund" element={<ServerContractScreenRefund />} />

          <Route path="/NFT" element={<NFTContractScreen />} />
           {/*<Route path="/NFTstrageTest" element={<NFTstrageTest />} />*/}
           <Route path="/token0" element={<TokenDisplay0 />} />

          <Route path="/token" element={<TokenDisplay />} />
          <Route path="/NFTmanage" element={<NFTmanage/>} />
          <Route path="/NFTmanage2" element={<NFTmanage2/>} />
          <Route path="/NFTmanageRefund" element={<NFTmanageRefund/>} />

          <Route path="/TokenStats" element={<TokenStats/>} />
          <Route path="/TokenStats2" element={<TokenStats2/>} />

          <Route path="/" element={<GachaGame />} />
          <Route path="/userEth" element={<GachaGameEth/>} />
          <Route path="/userEthRefund" element={<GachaGameEthRefund/>} />

          
          <Route path="/Bulk参加" element={<GachaGameEthBulk/>} />


         
        </Routes>
        {ipfsUrl && <p>IPFS URL: {ipfsUrl}</p>}

      </div>
    </Router>
  );
}



export default App;
