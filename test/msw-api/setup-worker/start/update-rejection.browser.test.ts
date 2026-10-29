import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../../setup/vitest-helpers'

const test = defineTestNetwork({
  handlers: [http.get('/resource', () => HttpResponse.text('hello world'))],
})

test('handles requests when updating an existing worker rejects', async ({
  network,
  fetch,
}) => {
  if (!('start' in network)) {
    throw new Error('Expected a browser worker instance')
  }

  await network.stop()

  const originalUpdate = ServiceWorkerRegistration.prototype.update
  let updateCount = 0
  ServiceWorkerRegistration.prototype.update = function () {
    updateCount++
    return Promise.reject(
      new DOMException(
        'The registration is being removed',
        'InvalidStateError',
      ),
    )
  }

  try {
    await network.start()
    expect(updateCount).toBe(1)

    const response = await fetch('/resource')
    expect(response.fromServiceWorker()).toBe(true)
    await expect(response.text()).resolves.toBe('hello world')
  } finally {
    ServiceWorkerRegistration.prototype.update = originalUpdate
  }
})
