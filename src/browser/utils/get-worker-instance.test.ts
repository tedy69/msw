import { getWorkerInstance } from './get-worker-instance'

const worker = { scriptURL: 'http://localhost/mockServiceWorker.js' }
const update = vi.fn()
let updateResult: Promise<ServiceWorkerRegistration>
const registration = {
  active: worker,
  update() {
    update()
    return updateResult
  },
}
const getRegistrations = vi.fn().mockResolvedValue([registration])
const register = vi.fn()
const findWorker = (scriptURL: string, workerURL: string) =>
  scriptURL === workerURL

beforeEach(() => {
  vi.stubGlobal('location', { href: 'http://localhost/' })
  vi.stubGlobal('navigator', {
    serviceWorker: {
      controller: worker,
      getRegistrations,
      register,
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
  getRegistrations.mockResolvedValue([registration])
})

test('returns the existing worker without waiting for its background update', async () => {
  const pendingUpdate = Promise.withResolvers<ServiceWorkerRegistration>()
  updateResult = pendingUpdate.promise

  await expect(
    getWorkerInstance('/mockServiceWorker.js', {}, findWorker),
  ).resolves.toEqual([worker, registration])
  expect(update).toHaveBeenCalledOnce()
  expect(register).not.toHaveBeenCalled()

  pendingUpdate.resolve(registration as unknown as ServiceWorkerRegistration)
})

test('handles a rejected background worker update', async () => {
  updateResult = Promise.reject(
    new DOMException('The registration is being removed', 'InvalidStateError'),
  )

  await expect(
    getWorkerInstance('/mockServiceWorker.js', {}, findWorker),
  ).resolves.toEqual([worker, registration])
  expect(register).not.toHaveBeenCalled()

  // Let the rejected update reach the unhandled-rejection check.
  await new Promise((resolve) => setTimeout(resolve, 0))
})

test('still rejects when registering a new worker fails', async () => {
  getRegistrations.mockResolvedValue([])
  register.mockRejectedValue(new Error('Registration failed'))

  await expect(
    getWorkerInstance('/mockServiceWorker.js', {}, findWorker),
  ).rejects.toThrow(
    'Failed to register the Service Worker:\n\nRegistration failed',
  )
  expect(update).not.toHaveBeenCalled()
})
