import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import { Injectable } from '@nestjs/common';

export class BitcoinWallet {
  address: any;
  mnemonic: any;
  seed: any;
  masterPrivateKey: any;
  publicKey: any;
  privateKey: any;
}

export interface UTXO {
  txid: string;
  vout: number;
  scriptPubKey: string;
  amount: number;
}

@Injectable()
export class BitcoinCryptoUtilsService {
  private ecc: any; // TODO: create type

  public generateMnemonic(): string {
    const mnemonic = bip39.generateMnemonic();
    return mnemonic;
  }

  public async generateWallet(network: bitcoin.Network): Promise<BitcoinWallet> {
    const mnemonic = this.generateMnemonic();
    return this.walletFromMnemonic(mnemonic, network);
  }

  public async walletFromMnemonic(mnemonic: string, network: bitcoin.Network) {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    console.log('Seed: ', seed);

    const ecc = await this.loadSecp256k1();

    const BIP32 = BIP32Factory(ecc);

    // The network parameter in the line BIP32.fromSeed(seed, bitcoin.networks.bitcoin)
    // in the context of Bitcoin and the bitcoinjs-lib library indicates that
    // in which network the created wallet will be used.
    // This is important because different networks use different address formats and other parameters,
    // such as prefixes for addresses.
    const root = BIP32.fromSeed(seed, network);

    // we use "!" to tell TypeScript we're sure it's non-null
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const masterPrivateKey: string = root.privateKey!.toString('hex');
    console.log('Master Private Key:', masterPrivateKey);

    // Select the appropriate path. For example, for BIP44:
    const path = "m/44'/0'/0'/0/0"; // This is an example for the first Bitcoin address

    const child = root.derivePath(path);
    const privateKey = child.privateKey;
    const publicKey = child.publicKey;
    const { address } = bitcoin.payments.p2pkh({ pubkey: publicKey });

    if (!privateKey) {
      throw new Error('Cant create Private Key');
    }

    return {
      address,
      mnemonic,
      seed,
      masterPrivateKey,
      publicKey,
      privateKey,
    } as BitcoinWallet;
  }

  public addressFromPublicKeyBuffer(publicKey: Buffer, network: bitcoin.Network): string {
    const { address } = bitcoin.payments.p2pkh({ pubkey: publicKey, network });
    if (!address) {
      throw new Error('Failed to generate address from public key buffer');
    }
    return address;
  }

  public addressFromPublicKeyHex(publicKey: string, network: bitcoin.Network): string {
    const publicKeyBuffer = Buffer.from(publicKey, 'hex');
    const { address } = bitcoin.payments.p2pkh({ pubkey: publicKeyBuffer, network });
    if (!address) {
      throw new Error('Failed to generate address from public key hex');
    }
    return address;
  }

  public async signTransaction(psbt: bitcoin.Psbt, privateKey: string) {
    const ecc = await this.loadSecp256k1();
    const ECPair = ECPairFactory(ecc);

    const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'));
    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    return psbt.extractTransaction().toHex();
  }

  public async addressFromPrivateKey(privateKey: string): Promise<string> {
    const ecc = await this.loadSecp256k1();
    const ECPair = ECPairFactory(ecc);

    // Creating ECPair from a private key
    const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'));
    if (!keyPair.publicKey) {
      throw new Error('Failed to generate public key from private key');
    }

    // Obtaining a public key and creating a Bitcoin address
    const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });
    if (!address) {
      throw new Error('Failed to generate address from private key');
    }

    return address;
  }

  private async loadSecp256k1() {
    if (!this.ecc) {
      this.ecc = await import('tiny-secp256k1').catch((error) => {
        console.error(error);
        throw new Error('Failed to load ecc module');
      });
    }
    return this.ecc;
  }
}
