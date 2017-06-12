signatura-api
=============

Signatura API client for JavaScript

## Usage

Get your API token from account menu > Security > API key. You will also need
your account's raw private key, which you can find in the same page under the
Account Recovery Phrase section.

Here is a an example for a self-signed document:


    import { Client, PrivateKey } from 'signatura-api'

    const privateKey = new PrivateKey("mykey")
    const client = new Client("mytoken")

    var req = client.createDocument(privateKey)

    req.setTitle("Foo")
    req.setDescription("Bar")
    req.setFile(file) // use a File-like object here

    // adding self
    req.addSigner({ id: "myuserid", public_key: privateKey.publicKey })
    
    req.submit() // returns a promise


## Author

Federico Bond

## License

MIT
