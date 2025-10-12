/**
 * Mock token data for development
 * Used when backend is not available
 */

import { Token, TokenListResponse } from '../types/token';

// Monad Testnet Tokens (chainId: 10143)
// Note: Using testnet placeholder addresses - will be replaced with actual deployed addresses
const monadTokens: Token[] = [
  {
    address: '0x0000000000000000000000000000000000000001',
    symbol: 'WMON',
    name: 'Wrapped Monad',
    chainId: 10143,
    decimals: 18,
    logoUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAHIElEQVR4Ae2cPW8cRRjHn9k3+6o4KVIEKboIQkVkR7K7EDkKggKJJEqBRBPbHVWwv0DsL5Dgii42DRJFlIBEAQLFMulsKReZioA4kEhBAZfK9r3sMP9dr3O+O593np3Z9dtPsnK+nPdu/ve8zTOzI8gAUsqhRqNxXQgaplCWpaARQTRE8c++QBJVBYkqCapISc99v7UkRKlKGRHEBKI1m83b6sG4+m2cDiSiooSdzyKmtoCvhQs/o31kYVlR1rno+q05XSG1BFRueuewCdeFcGZ9359L/fI0L1pfXy97rvtQ2d8IHQGUKFXXD6+ksUZnrxcod73luc6zoyIeUHGx3Gw4z5rNzet7vbavgHBZGbYW6TC77O4MyZAeRmGrD7u68Fa8m6Vj+sbFngLCdKE+HbONcNwJz/O+7Hq+84k4YSDmHUm37UfN88OLnYmlKwa6rvOYjsXrxVCz4XZ55Q4BEfeUSZbpmF2QI43Nzdn2Z7ZdeMt1/6CCefUf0doK0a+/EP3zMn7u9Bmis28Rjb1LdOIkFY1y5eCcEKKGX7YFbNY3F1T9M0EFAbF+/Ibor9/7v+7CGNGl9wsWUtKcPzAwi4eRgEVa38YG0dPviVZ/1vozGlXWOHa5MCG3rTCKga5L41QAsLaFu/riAfzNV1/Erl4AQ816HT2B2AIb9XruUzW4K0e4XsCl8ZMvYskPgisib/dFkniwqGLe32SUE6eIPvk0X5dWbnzSydN9kSjgdqbFA6/+3br2S8qNlurCO6qRmIvrrq3GA8RAbYFr379rLjTshapaRjxVSw9HDy3y9If4Jy8QXzfW7cfFMAzLjqSwTBbJW7w839d1xLBo1DetmV9R4rVjOUPX9uxIc7Eh3mCJtLH8JQ55ZAGTH/rsm2r6Nkp0/oIScDAug3BtzJd1Pg+wYYnGXdiEeLA0TNVGL8ei9YJTiNtwZ6MWiAFlES+NcAnvXYtrvr2aD+3gs6HghkWbwpgFYjCowTjoCNcOSpWFe3q1Jd4LMxa0yExgREDEJW6RDOEufaAnXDucL87ktM9IFuaId/qNeBBwRa540XXO6Mc1fNYHC2SEzAIiruiKhwFPTccZ1gS4nq5LJg3crGQSEL04naQB15masVNOwJJ1QdLTSUK9YAuIuPfTt+lfD2ubnDEXvHtdH/FUl+++jpMRF7aAK8vpXRcDQ7zLEuvSAMvWna1gDFlKL5aAsL60RSwWgTjuxSEph3TBWLh9RJaAOt9Y3q12CMiZM3MTiraAybptGjCQvFfNuFaIZIKx6aItIGJfWhCcswRoLlwr1GlQJGgLqJv2XxSw7Mi1Qs4SqbaAusEWayFFwBGQk0isNVQTYLFFuDGs0NRMpx/aAnIK4bxWyTrRbVtxxqYt4NvvkDYQsAgrPK/5WTkWqy0gCmNdIF4RVgg31snG2Kyki7aAqOs431QRVoi6Lu17wjA4NSsriXCmZkVYYR4zJpaACLbcOWdeVoipWdrCeDTDzld2GRPtEj2l9zcQz/ZCOzZsokOe1toxBk7sS2ALiOD84cekjYkm5m6gEMaGTZ3rX/0o23w9UyHNbWKaaKV3AsvG4pLO8gK8iFOWtZN5JoKEwlmPMOXKsLb79/SvB9c10WozMpW7OakfDzHgLJshEetgyZwNm8mypgmMLqxjMDpZFgOZnNYrdiHc6nK2jD41s88W1hNQNmCRRgfE0TTWYEI4gJDDidu7sS82F2FAuxXnpoQDNjYXWdlgyRGx/Q4kiPZiLe4lmip5bG20tLZDlbvNDfHQ9GzF5i5VZOEaWYD7oQ+SeMCRJK0ICIq5gyi/98fpHo4QokIWKUrEPN5Xkqh6JOWfGU6ASkWy5cLGFK4TvM/Va2Z3ofbhuadcuCIsCwhQqqDmw31ytu5WQmF+c8LeBqZOVPatiOgsrEadsSbPI8tu1n5gwybEy/dmw/Bccrvr47xPYDN5K0S/QtwiFT8YuBjv0pfyifLiccqRZFcp9hhyrREui55kHuu/nagEMo9/IwvccmPcM5z7cSdw6ZVl3i3/WTanZyVyX1GqbmeP6DgPQXeoINLegQRr4/QgTYKzBr0gmIwfb1GkFbYTWSTa/r/tPPYEnWPu0qNpEuvD4x31S9FWeCCQ4Zw/UJpNfu0qAIs4gOKggKmbFwyca3+uq6XfbLVukKUGwwGnhlMtO5/sErBUKlUlhdN0zA6EQ5O9jgTtuagUBKVF+DodE6O08LyBR73+q+8kuLG5rpKKc7STSkfS6GTPLsLWaZa4Ne+onSlYQyiLvLEPqY9BxsGMR+dsQVHx/NYNI8cgAySWAOn78MfFWuSyQXAx7Ynm2o3AyBodmhXCuUWHBwg37wWDnycHK6aF3UmN3ZrGBbm3D27hLZZItp5whNu+AhkgEVNdbkSQM6y63OV9Fi9VQqCakFSRAksYsuL7g4+4orXzPzjT+B6o8cvzAAAAAElFTkSuQmCC',
  },
  {
    address: '0x0000000000000000000000000000000000000002',
    symbol: 'USDC',
    name: 'USD Coin',
    chainId: 10143,
    decimals: 6,
    logoUri: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
  },
  {
    address: '0x0000000000000000000000000000000000000003',
    symbol: 'USDT',
    name: 'Tether USD',
    chainId: 10143,
    decimals: 6,
    logoUri: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
  },
  {
    address: '0x0000000000000000000000000000000000000004',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    chainId: 10143,
    decimals: 18,
    logoUri: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  },
  {
    address: '0x0000000000000000000000000000000000000005',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    chainId: 10143,
    decimals: 8,
    logoUri: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png',
  },
];

// Base Sepolia Tokens (chainId: 84532)
// Using real Base Sepolia testnet addresses where available
const baseTokens: Token[] = [
  {
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    chainId: 84532,
    decimals: 18,
    // TokenIcon will try multiple sources via fallback mechanism
  },
  {
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    symbol: 'USDC',
    name: 'USD Coin',
    chainId: 84532,
    decimals: 6,
  },
  {
    address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    chainId: 84532,
    decimals: 8,
  },
  {
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    symbol: 'USDT',
    name: 'Tether USD',
    chainId: 84532,
    decimals: 6,
  },
  {
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    chainId: 84532,
    decimals: 18,
  },
];

const allTokens = [...monadTokens, ...baseTokens];

export const mockTokensApi = {
  getTokens: (chainIds?: number | number[], search?: string): TokenListResponse => {
    let filteredTokens = allTokens;

    // Filter by chain ID(s)
    if (chainIds) {
      const chainIdArray = Array.isArray(chainIds) ? chainIds : [chainIds];
      filteredTokens = filteredTokens.filter((t) => chainIdArray.includes(t.chainId));
    }

    // Filter by search query
    if (search) {
      const query = search.toLowerCase();
      filteredTokens = filteredTokens.filter(
        (t) =>
          t.symbol.toLowerCase().includes(query) ||
          t.name.toLowerCase().includes(query)
      );
    }

    return {
      tokens: filteredTokens,
      count: filteredTokens.length,
    };
  },

  getToken: (chainId: number, address: string): Token | null => {
    return allTokens.find((t) => t.chainId === chainId && t.address.toLowerCase() === address.toLowerCase()) || null;
  },
};
