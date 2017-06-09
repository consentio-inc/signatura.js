import * as crypto from './crypto'

export function signRaw(document, privateKey) {
  return crypto.ecdsaSign(new Buffer(document.raw_hash, 'hex'), privateKey).toString('hex')
}

export function decryptFile(document, encFileContent, privateKey) {
  return crypto.decryptFile(new Buffer(encFileContent), getKey(document, privateKey))
}

function encryptKey(documentKey, creatorKey, receiverKey) {
  return crypto
    .encryptECIES(new Buffer(documentKey), new PrivateKey(creatorKey), new PublicKey(receiverKey))
    .toString('hex')
}

export function hashFile(fileContent) {
  return crypto.sha256(fileContent).toString('hex')
}

export function getKey(document, privateKey) {
  if (document.public) {
    // The decryption key is available in plain-text:
    return new Buffer(document.filekey, 'hex')
  }

  if (document.workgroup_key) {
    // Decrypt and use the workgroup's privateKey instead:
    privateKey = new PrivateKey(decryptKeyHex(document.workgroup_key, privateKey))
  }

  return decryptKeyHex(document.secret_key, privateKey)
}

class DocumentBuilder {

  constructor(requestKey) {
    this._requestKey = requestKey
    this.privateKey = null
    this.participants = []
  }

  async requestKey() {
    if (!this.privateKey) {
      this.privateKey = await this._requestKey()
    }
    return this.privateKey
  }

  setTitle = (title) => {
    this.title = title
    return this
  }

  setDescription = (description) => {
    this.description = description
    return this
  }

  addObservers = (observers) => {
    observers.forEach(this.addObserver)
    return this
  }

  addWorkgroups = (workgroups) => {
    workgroups.forEach(this.addWorkgroup)
    return this
  }

  addObserver = (observer) => {
    return this.addParticipant('observer', observer)
  }

  addWorkgroup = (workgroup) => {
    return this.addParticipant('workgroup', workgroup)
  }

  removeObserver = (observer) => {
    return this.removeParticipant('observer', observer)
  }

  removeWorkgroup = (workgroup) => {
    return this.removeParticipant('workgroup', workgroup)
  }

  setPublic = value => {
    if (value) {
      return this.addParticipant('public')
    } else {
      return this.removeParticipant('public')
    }
  }

  getDocumentKey(privateKey) {
    // eslint-disable-line no-unused-vars
    return new Error('_getDocumentKey should be implemented in subclass')
  }

  requiresKey = participant => {
    return participant.action == 'add'
  }

  createKeyIfNecessary = participant => {
    const { entity } = participant

    if (entity) participant.id = entity.id

    if (this._requiresKey(participant)) {
      if (!this.privateKey) {
        throw new Error('must call requestKey before _createKeyIfNecessary')
      }

      const documentKey = this.getDocumentKey(this.privateKey)

      if (entity) {
        participant.key = encryptKey(documentKey, this.privateKey, entity.public_key)
      } else {
        participant.key = documentKey.toString('hex')
      }
    }

    if (entity) delete participant.entity

    return participant
  }

  async getParticipantsWithKeys() {
    if (this.participants.some(this.requiresKey)) {
      await this._requestKey()
    }

    return this.participants.map(this.createKeyIfNecessary)
  }
}

export class CreateDocument extends DocumentBuilder {

  constructor(requestKey) {
    super(requestKey)
    this.documentKey = crypto.randomSecret(32)
  }

  setFile = (file) => {
    this.file = file
    return this
  }

  addSigners = (signers) => {
    signers.forEach(this.addSigner)
    return this
  }

  addSigner = (signer) => {
    return this._addParticipant('signer', signer)
  }

  addParticipant = (type, entity = null) => {
    if (type === 'public') {
      this.participants.push({ action: 'add', type, key: this.documentKey.toString('hex') })
    } else {
      this.participants.push({ action: 'add', type, entity })
    }

    return this
  }

  removeParticipant = (type, entity = null) => {
    const index = this.participants.findIndex(p => {
      if (type === 'public') return p.type === 'public'
      else return p.type === type && p.entity.id === entity.id
    })

    if (index !== -1) {
      this.participants.splice(index, 1)
    }

    return this
  }

  getDocumentKey(privateKey) {
    return this.documentKey
  }

  build = async () => {
    const fileBuffer = await fileToBuffer(this.file)

    const ciphertext = crypto.encryptFile(fileBuffer, this.documentKey)
    const rawHash = crypto.sha256(fileBuffer)
    const hash = crypto.sha256(rawHash)

    const participants = await this._getParticipantsWithKeys()

    return {
      title: this.title,
      description: this.description || '',
      participants: participants,
      content: ciphertext.toString('base64'),
      raw_hash: rawHash.toString('hex'),
      hash: hash.toString('hex'),
      filename: this.file.name,
      mime_type: this.file.type || 'application/octet-stream',
    }
  }
}

export class UpdateDocument extends DocumentBuilder {

  constructor(requestKey, originalDocument) {
    super(requestKey)
    this.original = originalDocument
    this.documentKey = null
  }

  replaceObservers = (newObservers) => {
    const { added, removed } = diffBy('id', this.original.observers, newObservers)

    for (let observer of added)
      this.addObserver(observer)
    for (let observer of removed)
      this.removeObserver(observer)

    return this
  }

  replaceWorkgroups = (newWorkgroup) => {
    const { added, removed } = diffBy('id', this.original.workgroups, newWorkgroup)

    for (let workgroup of added)
      this.addWorkgroup(workgroup)
    for (let workgroup of removed)
      this.removeWorkgroup(workgroup)

    return this
  }

  addParticipant = (type, entity = null) => {
    if (type !== 'public') {
      this.participants.push({ action: 'add', type, entity })
    } else {
      if (!isPublic(this.original)) this.participants.push({ action: 'add', type })
    }

    return this
  }

  removeParticipant = (type, entity = null) => {
    if (type !== 'public') {
      this.participants.push({ action: 'remove', type, id: entity.id })
    } else {
      if (isPublic(this.original)) this.participants.push({ action: 'remove', type })
    }

    return this
  }

  getDocumentKey(privateKey) {
    return getKey(this.original, privateKey)
  }

  async build() {
    const { title, description } = this
    const participants = await this.getParticipantsWithKeys()

    return { title, description, participants }
  }
}
