import type { FastifyInstance } from 'fastify'
import { db } from '@cfr/db'
import { tenants } from '@cfr/db'
import { eq } from 'drizzle-orm'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

// Lazy-load Stripe only if configured
async function getStripe() {
  if (!STRIPE_SECRET_KEY) return null
  const { default: Stripe } = await import('stripe')
  return new Stripe(STRIPE_SECRET_KEY)
}

export async function billingRoutes(app: FastifyInstance) {
  // Create checkout session
  app.post('/checkout', async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: 'Not authenticated' })

    const stripe = await getStripe()
    if (!stripe) {
      return reply.code(503).send({
        error: 'Payment system not configured. Set STRIPE_SECRET_KEY environment variable.',
        fallback: true,
      })
    }

    const tenant = db.select().from(tenants).where(eq(tenants.id, request.auth.tenantId)).get()
    if (!tenant) return reply.code(404).send({ error: 'Tenant not found' })

    if (tenant.plan === 'pro') {
      return reply.code(400).send({ error: 'Already on Pro plan' })
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Copilot Flight Recorder — Professional',
              description: 'Unlimited agents, full audit trail, Teams & Slack alerts, Graph API sync',
            },
            unit_amount: 2900, // $29.00
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        success_url: `${FRONTEND_URL}/app?payment=success`,
        cancel_url: `${FRONTEND_URL}/pricing`,
        client_reference_id: request.auth.tenantId,
        customer_email: request.auth.email,
        metadata: {
          tenantId: request.auth.tenantId,
        },
      })

      return reply.send({ url: session.url })
    } catch (err) {
      request.log.error('Stripe checkout error')
      return reply.code(500).send({ error: 'Failed to create checkout session' })
    }
  })

  // Stripe webhook
  app.post('/webhook', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const stripe = await getStripe()
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      return reply.code(503).send({ error: 'Stripe not configured' })
    }

    const sig = request.headers['stripe-signature'] as string
    if (!sig) return reply.code(400).send({ error: 'Missing stripe-signature' })

    try {
      // Use raw body for signature verification
      const rawBody = (request as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(request.body)
      const event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as { client_reference_id?: string; metadata?: { tenantId?: string } }
          const tenantId = session.client_reference_id ?? session.metadata?.tenantId
          if (tenantId) {
            db.update(tenants).set({ plan: 'pro' }).where(eq(tenants.id, tenantId)).run()
            request.log.info(`Tenant ${tenantId} upgraded to pro`)
          }
          break
        }
        case 'customer.subscription.deleted': {
          const sub = event.data.object as { metadata?: { tenantId?: string } }
          const tenantId = sub.metadata?.tenantId
          if (tenantId) {
            db.update(tenants).set({ plan: 'free' }).where(eq(tenants.id, tenantId)).run()
            request.log.info(`Tenant ${tenantId} downgraded to free`)
          }
          break
        }
      }

      return reply.send({ received: true })
    } catch (err) {
      request.log.warn('Stripe webhook signature verification failed')
      return reply.code(400).send({ error: 'Webhook signature verification failed' })
    }
  })

  // Get billing status
  app.get('/status', async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: 'Not authenticated' })

    const tenant = db.select().from(tenants).where(eq(tenants.id, request.auth.tenantId)).get()
    if (!tenant) return reply.code(404).send({ error: 'Tenant not found' })

    return reply.send({
      plan: tenant.plan,
      stripeConfigured: Boolean(STRIPE_SECRET_KEY),
    })
  })
}
