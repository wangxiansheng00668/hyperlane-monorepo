import { Debugger, debug } from 'debug';
import { ethers } from 'ethers';

import { ChainMap, ChainName } from './types';
import { MultiGeneric, objMap } from './utils';

export interface IChainConnection {
  provider: ethers.providers.Provider;
  signer?: ethers.Signer;
  overrides?: ethers.Overrides;
  confirmations?: number;
  blockExplorerUrl?: string;
}

export class ChainConnection {
  provider: ethers.providers.Provider;
  signer?: ethers.Signer;
  overrides: ethers.Overrides;
  confirmations: number;
  blockExplorerUrl?: string;
  logger: Debugger;

  constructor(dc: IChainConnection) {
    this.provider = dc.provider;
    this.signer = dc.signer;
    this.overrides = dc.overrides ?? {};
    this.confirmations = dc.confirmations ?? 0;
    this.blockExplorerUrl = dc.blockExplorerUrl ?? 'UNKNOWN_EXPLORER';
    this.logger = debug('abacus:ChainConnection');
  }

  getConnection = (): ethers.providers.Provider | ethers.Signer =>
    this.signer ?? this.provider;

  getAddress = (): Promise<string> | undefined => this.signer?.getAddress();

  getTxUrl(response: ethers.providers.TransactionResponse): string {
    return `${this.blockExplorerUrl}/tx/${response.hash}`;
  }

  async getAddressUrl(): Promise<string> {
    return `${
      this.blockExplorerUrl
    }/address/${await this.signer!.getAddress()}`;
  }

  async handleTx(
    tx: ethers.ContractTransaction | Promise<ethers.ContractTransaction>,
  ): Promise<ethers.ContractReceipt> {
    const response = await tx;
    this.logger(
      `Pending ${this.getTxUrl(response)} (waiting ${
        this.confirmations
      } blocks for confirmation)`,
    );
    return response.wait(this.confirmations);
  }
}

export class MultiProvider<
  Chain extends ChainName = ChainName,
> extends MultiGeneric<Chain, ChainConnection> {
  constructor(chainConnectionConfigs: ChainMap<Chain, IChainConnection>) {
    super(
      objMap(
        chainConnectionConfigs,
        (_, connection) => new ChainConnection(connection),
      ),
    );
  }
  getChainConnection(chain: Chain): ChainMap<Chain, ChainConnection>[Chain] {
    return this.get(chain);
  }
  // This doesn't work on hardhat providers so we skip for now
  // ready() {
  //   return Promise.all(this.values().map((dc) => dc.provider!.ready));
  // }
}
