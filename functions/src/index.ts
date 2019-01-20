import * as functions from 'firebase-functions'
import axios from 'axios'

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
export const helloWorld = functions.https.onRequest(
  async (request, response) => {
    //  response.send("Hello from Firebase!");
    const res = await axios.post(functions.config().slack.webhook_url, {
      text: 'Hello from Firebase!'
    })
    if (res.status >= 200 && res.status < 300) {
      const data = res.data
      response.send(data)
    } else {
      response.send(res.statusText)
    }
  }
)
