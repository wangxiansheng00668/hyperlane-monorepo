import * as contracts from '@abacus-network/ts-interface/dist/abacus-core';
import { BeaconProxy } from '../utils/proxy';
import { Contracts } from '../contracts';
import {
  CoreContractAddresses,
  ProxiedAddress,
} from '../../src/config/addresses';
import * as ethers from 'ethers';

export class CoreContracts extends Contracts {
  upgradeBeaconController?: contracts.UpgradeBeaconController;
  xAppConnectionManager?: contracts.XAppConnectionManager;
  updaterManager?: contracts.UpdaterManager;
  governanceRouter?: BeaconProxy<contracts.GovernanceRouter>;
  home?: BeaconProxy<contracts.Home>;
  replicas: Record<number, BeaconProxy<contracts.Replica>>;

  constructor() {
    super();
    this.replicas = {};
  }

  toObject(): CoreContractAddresses {
    const replicas: Record<number, ProxiedAddress> = {};
    Object.keys(this.replicas!)
      .map((d) => parseInt(d))
      .map((domain: number) => {
        replicas[domain] = this.replicas[domain].toObject();
      });

    return {
      upgradeBeaconController: this.upgradeBeaconController!.address,
      xAppConnectionManager: this.xAppConnectionManager!.address,
      updaterManager: this.updaterManager!.address,
      governanceRouter: this.governanceRouter!.toObject(),
      home: this.home!.toObject(),
      replicas,
    };
  }

  static fromAddresses(
    addresses: CoreContractAddresses,
    provider: ethers.providers.JsonRpcProvider,
  ): CoreContracts {
    const core = new CoreContracts();
    core.upgradeBeaconController =
      contracts.UpgradeBeaconController__factory.connect(
        addresses.upgradeBeaconController,
        provider,
      );
    core.xAppConnectionManager =
      contracts.XAppConnectionManager__factory.connect(
        addresses.xAppConnectionManager,
        provider,
      );
    core.updaterManager = contracts.UpdaterManager__factory.connect(
      addresses.updaterManager,
      provider,
    );

    // TODO: needs type magic for turning governance, home and replicas to BeaconProxy contracts
    const governanceRouterImplementation =
      contracts.GovernanceRouter__factory.connect(
        addresses.governanceRouter.implementation,
        provider,
      );
    const governanceRouterProxy = contracts.GovernanceRouter__factory.connect(
      addresses.governanceRouter.proxy,
      provider,
    );
    const governanceRouterUpgradeBeacon =
      contracts.UpgradeBeacon__factory.connect(
        addresses.governanceRouter.beacon,
        provider,
      );
    core.governanceRouter = new BeaconProxy<contracts.GovernanceRouter>(
      governanceRouterImplementation,
      governanceRouterProxy,
      governanceRouterUpgradeBeacon,
    );

    const homeImplementation = contracts.Home__factory.connect(
      addresses.home.implementation,
      provider,
    );
    const homeProxy = contracts.Home__factory.connect(
      addresses.home.proxy,
      provider,
    );
    const homeUpgradeBeacon = contracts.UpgradeBeacon__factory.connect(
      addresses.home.beacon,
      provider,
    );
    core.home = new BeaconProxy<contracts.Home>(
      homeImplementation,
      homeProxy,
      homeUpgradeBeacon,
    );

    Object.keys(addresses.replicas!)
      .map((d) => parseInt(d))
      .map((domain: number) => {
        const replicaImplementation = contracts.Replica__factory.connect(
          addresses.replicas![domain].implementation,
          provider,
        );
        const replicaProxy = contracts.Replica__factory.connect(
          addresses.replicas![domain].proxy,
          provider,
        );
        const replicaUpgradeBeacon = contracts.UpgradeBeacon__factory.connect(
          addresses.replicas![domain].beacon,
          provider,
        );
        core.replicas[domain] = new BeaconProxy<contracts.Replica>(
          replicaImplementation,
          replicaProxy,
          replicaUpgradeBeacon,
        );
      });

    return core;
  }
}