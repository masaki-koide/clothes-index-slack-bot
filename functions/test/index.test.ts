// import * as admin from 'firebase-admin'
import * as functionsTest from 'firebase-functions-test'
import axios from 'axios'
import { FeaturesList } from 'firebase-functions-test/lib/features'

describe('sendClothsIndexs', () => {
  let features: FeaturesList
  let spy: jest.Mock

  beforeAll(() => {
    // jest.spyOn(admin, 'initializeApp').mockImplementation()
    features = functionsTest()
    features.mockConfig({ pubsub: { topic: 'testTopic' }, slack: { webhook_url: 'testUrl' } })
  })

  test('success', async done => {
    const { sendClothsIndex } = await import('../src/index')
    const wrapped = features.wrap(sendClothsIndex)
    const data = 'hoge'
    spy = jest.spyOn(axios, 'post').mockReturnValue({ status: 200, data: 'hoge' })
    await wrapped(data)
    const { calls } = spy.mock
    const [url, { text }] = calls[0]
    expect(url).toEqual('testUrl')
    expect(text).toContain('【今日の洗濯指数】')
    done()
    // TODO:Jestが正常に終了しない
  })

  afterEach(() => {
    spy.mockRestore()
  })

  afterAll(() => {
    features.cleanup()
  })
})
