import bitcore from 'bitcore-lib'
import BitcoreECIES from 'bitcore-ecies'
import BitcoreAESCBC from 'bitcore-ecies/lib/aescbc'
import * as errors from './errors'

const { Hash, Random, ECDSA: BitcoreECDSA } = bitcore.crypto

export function sha256(message) {
  return Hash.sha256(message)
}


export function randomSecret(size = 32) {
  return bitcore.crypto.Random.getRandomBuffer(size)
}

export const ECIES = {

  encrypt(buffer, privateKey, publicKey) {
    return BitcoreECIES()
      .privateKey(privateKey)
      .publicKey(publicKey || privateKey.publicKey)
      .encrypt(buffer)
  },

  decrypt(buffer, privateKey, publicKey) {
    return BitcoreECIES()
      .privateKey(privateKey)
      .publicKey(publicKey || privateKey.publicKey)
      .decrypt(buffer)
  }
}

export const AESCBC = {

  encrypt(buffer, key) {
    const iv = Random.getRandomBuffer(16)

    const ciphertext = BitcoreAESCBC.encryptCipherkey(buffer, key, iv)
    const mac = Hash.sha256hmac(ciphertext, key)

    return Buffer.concat([ciphertext, mac])
  },

  decrypt(buffer, key) {
    const ciphertext = buffer.slice(0, -32)
    const mac = buffer.slice(-32)

    const mac2 = Hash.sha256hmac(ciphertext, key)

    let equal = true
    for (let i = 0; i < mac.length; i++) {
      equal &= mac[i] === mac2[i]
    }

    if (!equal) {
      throw new errors.InvalidChecksum({ expected: mac, actual: mac2 })
    }

    return BitcoreAESCBC.decryptCipherkey(ciphertext, key)
  }
}


export const ECDSA = {

  sign(buffer, privateKey) {
    return BitcoreECDSA.sign(buffer, privateKey).toDER()
  },

  verify(buffer, publicKey) {
    return BitcoreECDSA.verify(buffer, publicKey)
  }
}
