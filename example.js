const Client = require('./index')


client = new Client({
  url: 'http://localhost:8000/v1',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE0OTIxMTIyNDQsImp0aSI6Ik4yTU5MWkxTIiwic3ViIjoiZmVkZXJpY29ib25kIn0.7aCKb4k56HeLZMQis44KnN_aOGis54F9N69ZrB607ho'
})


var req = client.getDocument('b42aeadd-2454-4486-8734-15a8977ccd74')

req.then(function(res) { console.log(res.data) })
