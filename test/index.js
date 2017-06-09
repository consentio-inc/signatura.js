import { assert } from 'chai'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'

import Client from '../src/client'

const mock = new MockAdapter(axios)

describe('Client', function() {

  const token = 'abcdef'

  it('should contruct succesfully', function() {
    assert.ok(new Client({ token }))
  })

  it('should fetch existing documents', async function() {
    const client = new Client({ token })

    mock.onGet('/documents/12345678').reply(200, {
      id: '12345678'
    })

    const doc = await client.getDocumentById('12345678')

    assert.deepEqual(doc, { id: '12345678' })
  })

  it('should create new documents', async function() {
    const client = new Client({ token })

    mock.onPost('/documents/add').reply(201, {
      id: '12345678',
      title: 'Hello',
    })

    const doc = await client.createDocument({ title: 'Hello' })

    assert.deepEqual(doc, { id: '12345678', title: 'Hello' })
  })
})
