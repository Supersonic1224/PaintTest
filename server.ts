import express from "express";
import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Stripe billing
  app.post("/api/stripe/send-bill", async (req, res) => {
    try {
      const { clientEmail, clientName, amount, proposalNo, description } = req.body;

      if (!clientEmail) {
        return res.status(400).json({ error: "Client email is required." });
      }
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valid bill amount is required." });
      }

      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey || stripeKey.trim() === "" || stripeKey === "YOUR_STRIPE_KEY") {
        return res.status(400).json({
          error: "Stripe API Key is not configured. Please open Settings (⚙️) -> Secrets and add your STRIPE_SECRET_KEY.",
          requiresConfig: true
        });
      }

      const stripe = new Stripe(stripeKey);

      // 1. Create or retrieve Customer
      // Search for existing customer to keep database clean
      let customerId = "";
      try {
        const existingCustomers = await stripe.customers.list({
          email: clientEmail,
          limit: 1
        });
        if (existingCustomers.data.length > 0) {
          customerId = existingCustomers.data[0].id;
        }
      } catch (err) {
        console.warn("Could not list customers, will create a new one:", err);
      }

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: clientEmail,
          name: clientName || "Valued Client",
        });
        customerId = customer.id;
      }

      // 2. Create the Draft Invoice first
      const invoice = await stripe.invoices.create({
        customer: customerId,
        collection_method: "send_invoice",
        days_until_due: 7,
      });

      // 3. Create the Invoice Item and link it directly to this invoice
      await stripe.invoiceItems.create({
        customer: customerId,
        invoice: invoice.id,
        amount: Math.round(amount * 100), // in cents
        currency: "cad", // Default to Canadian Dollar
        description: description || `PaintNav Proposal #${proposalNo || "New"}`
      });

      // 4. Send the Invoice
      const sentInvoice = await stripe.invoices.sendInvoice(invoice.id);

      return res.json({
        success: true,
        invoiceId: sentInvoice.id,
        invoiceUrl: sentInvoice.hosted_invoice_url,
        invoicePdf: sentInvoice.invoice_pdf,
        status: sentInvoice.status
      });

    } catch (error: any) {
      console.error("Stripe invoice generation error:", error);
      return res.status(500).json({
        error: error.message || "An error occurred while creating/sending the Stripe invoice."
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
