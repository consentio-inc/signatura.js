import { PrivateKey } from 'bitcore-lib'
import { CreateDocument, UpdateDocument } from '../src/builder'


describe('CreateDocument', function() {
  it('creates with private key', function() {
    new CreateDocument(new PrivateKey())
  })
})
