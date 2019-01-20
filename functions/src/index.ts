import * as functions from 'firebase-functions'
import axios from 'axios'
import * as puppeteer from 'puppeteer'

interface CLOTHS_INDEX {
  index: string
  weather: string
  highTemp: string
  lowTemp: string
  precip: string // 降水確率
  forecast: string
}

let page: puppeteer.Page
const scrapingUrl = 'https://tenki.jp/indexes/cloth_dried/3/15/4510/'

export const sendClothsIndex = functions
  .region('asia-northeast1')
  .runWith({ memory: '1GB' })
  .pubsub.topic(functions.config().pubsub.topic)
  .onPublish(async (message, context) => {
    if (!page) {
      const browser = await puppeteer.launch({
        args: [
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-first-run',
          '--no-sandbox',
          '--no-zygote',
          '--single-process'
        ]
      })
      page = await browser.newPage()
    }
    await page.goto(scrapingUrl)
    await page.waitForSelector('.indexes-weather-wrap')
    const results = await page.$$eval<CLOTHS_INDEX[]>('.indexes-weather-wrap', elements => {
      // FIXME:外に出したいが型推論の課題をクリアしないといけない
      const unwrap = <T>(nullable: T | null, defaultValue: T = {} as T): T => {
        return nullable === null ? defaultValue : nullable
      }
      return elements.reduce<CLOTHS_INDEX[]>((result, element) => {
        const index = unwrap(element.querySelector('.indexes-telop-0')).textContent
        const weather = unwrap(element.querySelector('.weather-telop')).textContent
        const highTemp = unwrap(element.querySelector('.high-temp')).textContent
        const lowTemp = unwrap(element.querySelector('.low-temp')).textContent
        const precip = unwrap(element.querySelector('.precip')).textContent
        const forecast = unwrap(element.querySelector('.indexes-telop-1')).textContent
        if (!index || !weather || !highTemp || !lowTemp || !precip || !forecast) {
          return result
        }

        result.push({
          index,
          weather,
          highTemp,
          lowTemp,
          precip,
          forecast
        })

        return result
      }, [])
    })

    if (results.length !== 2) {
      throw new functions.https.HttpsError('internal', 'Scraping failed')
    }

    const text = results.reduce((prev, curr, i) => {
      return (
        prev +
        `${i === 0 ? '【今日' : '【明日'}の洗濯指数】
  指数:${curr.index}
  天気:${curr.weather}
  最高気温:${curr.highTemp}
  最低気温:${curr.lowTemp}
  降水確率:${curr.precip}
  メッセージ:${curr.forecast}
  `
      )
    }, '')

    const res = await axios.post(functions.config().slack.webhook_url, { text })
    // FIXME:適切なreturn
    if (res.status >= 200 && res.status < 300) {
      const data = res.data
      console.log(data)
    } else {
      console.error(res.statusText)
    }
  })
