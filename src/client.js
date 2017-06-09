import axios from 'axios'
import * as errors from './errors'

export default class Client {

  constructor(token) {
    this.token = token
    this.axios = axios.create({
      baseURL: 'https://api.signatura.co/v1',
      contentType: 'json',
      responseType: 'json',
      headers: { 'Authorization': 'Bearer ' + this.token },
    })
  }

  request(method, url, options = {}) {
    options = Object.assign({ method, url }, options)

    return this.axios(options)
      .then(res => res.data)
      .catch(handleError)
  }

  download(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.open('GET', url)
      xhr.responseType = 'arraybuffer'

      xhr.onload = () => {
        if (xhr.response) resolve(new Buffer(xhr.response))
      }

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 /* DONE */ && xhr.status !== 200) {
          reject(new errors.DownloadError({ xhr }))
        }
      }

      xhr.send()
    }).catch(raiseAPIError)
  }

  getUserById(userId) {
    return this.request('GET', `/users/${userId}`)
  }

  searchUsers(q) {
    return this.request('GET', '/users/search', { params: { q } })
  }

  getContacts() {
    return this.request('GET', '/contacts')
  }

  addContact(userId) {
    const data = { target: userId }
    return this.request('POST', '/contacts/add', { data })
  }

  acceptContact(userId) {
    const data = { target: userId }
    return this.request('POST', '/contacts/accept', { data })
  }

  rejectContact(userId) {
    const data = { target: userId }
    return this.request('POST', '/contacts/reject', { data })
  }

  removeContact(userId) {
    const data = { target: userId }
    return this.request('POST', '/contacts/remove', { data })
  }

  getDocuments() {
    // TODO: implement filters
    return this.request('GET', '/documents')
  }

  getDocumentById(documentId) {
    return this.request('GET', `/documents/${documentId}`)
  }

  async getDocumentFile(document) {
    const link = await this.request('POST', `/documents/${document.id}/download`)

    return this.download(link.url)
  }

  createDocument(data) {
    return this.request('POST', '/documents/add', { data })
  }

  updateDocument(documentId, data) {
    return this.request('POST', `/documents/${documentId}/update`, { data })
  }

  cancelDocument(document) {
    return this.request('POST', `/documents/${document.id}/cancel`)
  }

  signDocument(document, payload, raw_payload) {
    const data = { payload, raw_payload }
    return this.request('POST', `/documents/${document.id}/sign`, { data })
  }

  getWorkgroupById(workgroupId) {
    return this.request('GET', `/workgroups/${workgroupId}`)
  }

  getWorkgroups() {
    return this.request('GET', '/workgroups')
  }

  getLabels() {
    return this.request('GET', '/labels')
  }

  createLabel(data) {
    return this.request('POST', '/labels', { data })
  }

  updateLabel(labelId, data) {
    return this.request('PUT', `/labels/${labelId}`, { data })
  }

  deleteLabel(labelId) {
    return this.request('DELETE', `/labels/${labelId}`)
  }

  updateDocumentLabels(documentId, data) {
    return this.request('POST', `/documents/${documentId}/label`, { data })
  }

  createWorkgroup(data) {
    return this.request('POST', '/workgroups/add', { data })
  }

  updateWorkgroup(workgroupId, data) {
    return this.request('POST', `/workgroups/${workgroupId}/update`, { data })
  }

  removeWorkgroup(workgroupId) {
    return this.request('POST', `/workgroups/${workgroupId}/remove`)
  }

  getProfile() {
    return this.request('GET', '/users/me')
  }

  updateProfile(data) {
    return this.request('PATCH', '/users/me', { data })
  }
}

function errorFromResponseData(data) {
  // TODO: model possible server errors
  const { code, message } = data
  return new errors.ServerError({ code, message })
}

function handleError(err) {
  if (!err.response) {
    throw new errors.ConnectionError({ cause: err })
  }

  if (err.response.status == 404) {
    throw new errors.NotFoundError({ cause: err })
  }

  if (err.response.status == 500) {
    throw new errors.ServerError({ cause: err })
  }

  try {
    const data = JSON.parse(err.response.data)
    throw errorFromResponseData(data)
  } catch (err) {
    throw new errors.ServerError({ cause: err })
  }
}
